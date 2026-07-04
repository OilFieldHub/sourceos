export type Tone = "neutral" | "amber" | "green" | "red";

export function rfqStatusTone(status: string): Tone {
  switch (status) {
    case "EVALUATION":
      return "amber";
    case "AWARDED":
    case "CLOSED":
      return "green";
    default:
      return "neutral";
  }
}

export function poStageTone(stage: string): Tone {
  switch (stage) {
    case "PAID":
      return "green";
    case "GRN_RECEIVED":
    case "INSPECTED":
    case "INVOICED":
      return "amber";
    default:
      return "neutral";
  }
}

export function disputeTone(status: string): Tone {
  switch (status) {
    case "OPEN":
      return "red";
    case "MEDIATION":
      return "amber";
    case "RESOLVED":
      return "green";
    default:
      return "neutral";
  }
}

export function resultTone(result: string): Tone {
  return result === "PASSED" || result === "FULL" || result === "MATCHED" ? "green" : "amber";
}
