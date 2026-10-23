import { useEffect, useRef, useState } from "react";

// Render just the first page. A canvas has no native PDF viewer controls.
export default function PdfFlyerBackground({ src }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    let disposed = false;
    let started = false;
    let loadingTask;
    let renderTask;

    const destroyDocument = () => {
      const task = loadingTask;
      loadingTask = null;
      task?.destroy().catch(() => {});
    };

    const renderPreview = async () => {
      if (started || disposed) return;
      started = true;
      setStatus("loading");

      try {
        // Keep PDF.js and its worker out of the initial page load.
        const [{ getDocument, GlobalWorkerOptions }, { default: workerSrc }] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (disposed) return;

        GlobalWorkerOptions.workerSrc = workerSrc;
        loadingTask = getDocument({ url: src });
        const pdf = await loadingTask.promise;
        if (disposed) return;
        const page = await pdf.getPage(1);
        if (disposed) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.min(Math.max(canvas.clientWidth, 400) * pixelRatio, 1200);
        // Bound the bitmap size even for unusually tall flyers.
        const viewport = page.getViewport({
          scale: Math.min(width / baseViewport.width, 1600 / baseViewport.height),
        });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (!disposed) setStatus("ready");
      } catch {
        // The original document remains available through View Flyer.
        if (!disposed) setStatus("error");
      } finally {
        destroyDocument();
      }
    };

    // Only fetch and render flyers as their cards approach the viewport.
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void renderPreview();
        }
      },
      { rootMargin: "200px" }
    );
    if (observer) observer.observe(canvas);
    else void renderPreview();

    return () => {
      disposed = true;
      observer?.disconnect();
      renderTask?.cancel();
      destroyDocument();
    };
  }, [src]);

  return (
    <div className={`event-pdf-background event-pdf-background--${status}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      {status === "error" ? (
        <div className="event-pdf-background-fallback">
          <span className="material-symbols-outlined">description</span>
          <span>Flyer available</span>
        </div>
      ) : null}
    </div>
  );
}
