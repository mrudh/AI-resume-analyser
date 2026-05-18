export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      imageUrl: "",
      file: null,
      error: "Failed to convert PDF: browser environment required",
    };
  }

  try {
    const pdfjsModule = await import("pdfjs-dist/build/pdf.mjs");
    const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "/pdf.worker.min.mjs",
      import.meta.url
    ).href;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Failed to convert PDF: canvas context unavailable",
      };
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.jpg`, {
              type: "image/jpeg",
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob",
            });
          }
        },
        "image/jpeg",
        0.8
      );
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("convertPdfToImage error:", err);
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${message}`,
    };
  }
}