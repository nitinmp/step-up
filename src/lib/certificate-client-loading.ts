import { photoProxyUrl } from "@/lib/blob-storage";
import type { CertificateGalleryItem } from "@/lib/certificate-gallery-service";
import type {
  StarDayCertificate,
  StarWeekCertificate,
  WeekProgressCertificate,
} from "@/lib/certificate-service";

export type LoadableCertificate =
  | StarDayCertificate
  | WeekProgressCertificate
  | StarWeekCertificate;

export type CertificateLoadStage = "fetching" | "printing" | "done";

export const CERTIFICATE_LOAD_STAGE_LABELS: Record<CertificateLoadStage, string> =
  {
    fetching: "Fetching your score…",
    printing: "Printing your certificate…",
    done: "Done!",
  };

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function preloadCertificateImage(imageUrl: string) {
  const response = await fetch(photoProxyUrl(imageUrl));
  if (!response.ok) {
    throw new Error("Could not download certificate image.");
  }

  await response.blob();
}

export async function resolveCertificateWithStages<T extends LoadableCertificate>(
  loadCertificate: () => Promise<T>,
  onStage: (stage: CertificateLoadStage) => void,
): Promise<T> {
  onStage("fetching");
  const certificate = await loadCertificate();

  onStage("printing");
  await preloadCertificateImage(certificate.imageUrl);

  onStage("done");
  await delay(450);

  return certificate;
}

export function galleryItemDrawerTitle(item: CertificateGalleryItem): string {
  if (item.kind === "star-day") {
    return `${item.subtitle} certificate`;
  }

  if (item.kind === "week-progress") {
    return `Week ${item.weekNo} progress report`;
  }

  return `Week ${item.weekNo} Star of the Week`;
}

async function fetchWeekProgressCertificate(
  weekNo: number,
): Promise<WeekProgressCertificate> {
  const response = await fetch(`/api/certificates/week/${weekNo}`, {
    method: "POST",
  });
  const data = (await response.json()) as {
    certificate?: WeekProgressCertificate;
    error?: string;
  };

  if (!response.ok || !data.certificate) {
    throw new Error(data.error ?? "Could not load progress report.");
  }

  return data.certificate;
}

async function fetchStarWeekCertificate(
  weekNo: number,
): Promise<StarWeekCertificate> {
  const response = await fetch(`/api/certificates/star-week/${weekNo}`, {
    method: "POST",
  });
  const data = (await response.json()) as {
    certificate?: StarWeekCertificate;
    error?: string;
  };

  if (!response.ok || !data.certificate) {
    throw new Error(data.error ?? "Could not load certificate.");
  }

  return data.certificate;
}

async function fetchStarDayCertificate(id: string): Promise<StarDayCertificate> {
  const response = await fetch(`/api/certificates/star-day/${id}`);
  const data = (await response.json()) as {
    certificate?: StarDayCertificate;
    error?: string;
  };

  if (!response.ok || !data.certificate) {
    throw new Error(data.error ?? "Could not load certificate.");
  }

  return data.certificate;
}

export async function fetchGalleryCertificate(
  item: CertificateGalleryItem,
): Promise<LoadableCertificate> {
  if (item.kind === "star-day") {
    return fetchStarDayCertificate(item.id);
  }

  if (item.kind === "week-progress") {
    return fetchWeekProgressCertificate(item.weekNo!);
  }

  return fetchStarWeekCertificate(item.weekNo!);
}
