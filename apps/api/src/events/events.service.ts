import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Event } from '../database/entities/event.entity';

export interface RecordEventInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface ChainVerification {
  valid: boolean;
  brokenAtSequence: string | null;
}

function computeHash(params: {
  prevHash: string | null;
  createdAt: Date;
  type: string;
  entityType: string;
  entityId: string;
  note: string | null;
}): string {
  const canonical = [
    params.prevHash ?? '',
    params.createdAt.toISOString(),
    params.type,
    params.entityType,
    params.entityId,
    params.note ?? '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * The event bus for the platform: every domain module calls `record()` to
 * both append a tamper-evident row to the Event table (amendment #8 — the
 * append-only source of truth) and notify any in-process listeners. Writes
 * are serialized per-organization (in-process mutex) so `sequence` stays
 * monotonic and the hash chain never forks, without needing driver-specific
 * row locking (this runs as a single Node process for V1).
 */
@Injectable()
export class EventsService {
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async record(type: string, input: RecordEventInput): Promise<Event> {
    const event = await this.runExclusive(input.organizationId, () => this.append(type, input));
    this.eventEmitter.emit(type, { ...input, type, event });
    return event;
  }

  async listForOrg(organizationId: string): Promise<{ events: Event[]; chain: ChainVerification }> {
    const events = await this.eventsRepository.find({
      where: { organizationId },
      order: { sequence: 'ASC' },
    });
    return { events, chain: this.verify(events) };
  }

  /**
   * Looks up who performed a past action by reading it back off the event
   * log rather than adding a dedicated "requestedById"-style column —
   * the append-only Event table already is that record (amendment #8).
   * Used to enforce approver != requester (amendment #6) without a schema
   * change.
   */
  async getActorId(organizationId: string, type: string, entityId: string): Promise<string | null> {
    const event = await this.eventsRepository.findOne({
      where: { organizationId, type, entityId },
      order: { sequence: 'ASC' },
    });
    return event?.actorId ?? null;
  }

  private runExclusive<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(organizationId) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    this.locks.set(
      organizationId,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  }

  private async append(type: string, input: RecordEventInput): Promise<Event> {
    const last = await this.eventsRepository.findOne({
      where: { organizationId: input.organizationId },
      order: { sequence: 'DESC' },
    });

    const sequence = last ? BigInt(last.sequence) + 1n : 1n;
    const prevHash = last?.hash ?? null;
    const createdAt = new Date();
    const note = input.note ?? null;

    const hash = computeHash({
      prevHash,
      createdAt,
      type,
      entityType: input.entityType,
      entityId: input.entityId,
      note,
    });

    const event = this.eventsRepository.create({
      organizationId: input.organizationId,
      sequence: sequence.toString(),
      type,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId ?? null,
      note,
      payload: input.payload ?? null,
      prevHash,
      hash,
      createdAt,
      updatedAt: createdAt,
    });

    return this.eventsRepository.save(event);
  }

  private verify(eventsAscending: Event[]): ChainVerification {
    let prevHash: string | null = null;

    for (const event of eventsAscending) {
      if (event.prevHash !== prevHash) {
        return { valid: false, brokenAtSequence: event.sequence };
      }

      const expectedHash = computeHash({
        prevHash,
        createdAt: event.createdAt,
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        note: event.note,
      });

      if (expectedHash !== event.hash) {
        return { valid: false, brokenAtSequence: event.sequence };
      }

      prevHash = event.hash;
    }

    return { valid: true, brokenAtSequence: null };
  }
}
