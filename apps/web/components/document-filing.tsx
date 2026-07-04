"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { Btn } from "@/components/buttons";
import { FieldLabel, TextInput } from "@/components/text-input";
import { useAuthedApi } from "@/lib/use-authed-api";
import type { DocumentType, FiledDocument } from "@/lib/types";

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "MTC", label: "Mill Test Certificate" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "PHOTO", label: "Photo" },
  { value: "KYB_DOC", label: "KYB document" },
  { value: "OTHER", label: "Other" },
];

export function DocumentFiling({ entityType, entityId }: { entityType: string; entityId: string }) {
  const api = useAuthedApi();
  const [docs, setDocs] = useState<FiledDocument[] | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("MTC");
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    setDocs(await api.get<FiledDocument[]>(`/documents?entityType=${entityType}&entityId=${entityId}`));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function onFile() {
    if (!fileName.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await api.post("/documents", { entityType, entityId, documentType, fileName, url });
      setFileName("");
      setUrl("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function onArchive(id: string) {
    setBusy(true);
    try {
      await api.post(`/documents/${id}/archive`);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!docs) return null;

  return (
    <Card className="mb-6">
      <h2 className="mb-3 text-[13.5px] font-bold text-ink">Filed documents</h2>
      <div className="mb-4 space-y-1.5">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg bg-row px-3 py-2 text-[12.5px]">
            <div>
              <span className="font-mono font-semibold text-brand-dark">{d.code}</span>{" "}
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline">
                {d.fileName}
              </a>
            </div>
            <Btn variant="outline" className="px-2 py-1 text-[11px]" disabled={busy} onClick={() => onArchive(d.id)}>
              Archive
            </Btn>
          </div>
        ))}
        {docs.length === 0 && <p className="text-[12.5px] text-muted">No documents filed yet.</p>}
      </div>
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[160px_1fr_1fr_auto]">
        <div>
          <FieldLabel>Type</FieldLabel>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full rounded-xl border border-hairline bg-panel px-3 py-2.5 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-mint"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>File name</FieldLabel>
          <TextInput value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="e.g. mtc-flange-kit.pdf" />
        </div>
        <div>
          <FieldLabel>URL</FieldLabel>
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <Btn disabled={busy} onClick={onFile}>
          File
        </Btn>
      </div>
    </Card>
  );
}
