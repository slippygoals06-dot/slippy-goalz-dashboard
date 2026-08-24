import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Film, ZoomIn, Play, Loader2 } from "lucide-react";
import { listBookingAttachments, uploadBookingAttachment } from "../api";
import { useTheme, secondaryBtnStyle } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import imageCompression from "browser-image-compression";

const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp";
const VIDEO_ACCEPT = ".mp4,.mov";
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGES = 5;

const COMPRESS_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
};

function humanSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressBar({ progress, t }) {
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: t.name === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,17,21,0.08)",
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: t.accent,
          borderRadius: 2,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

function Lightbox({ src, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: 8,
          boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
          cursor: "default",
        }}
      />
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.15)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
}

/**
 * Attachments via FastAPI (service role) — never writes with the anon Supabase key.
 */
export default function BookingAttachments({ bookingId, role, allowVideo = false, compact = false }) {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const fetchAttachments = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const data = await listBookingAttachments(bookingId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load attachments", err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  function validate(file) {
    const isImage = IMAGE_MIMES.includes(file.type);
    const isVideo = VIDEO_MIMES.includes(file.type);

    if (!isImage && !isVideo) {
      showToast(`Unsupported file type: ${file.type || file.name.split(".").pop()}`, "error");
      return null;
    }
    if (isVideo && !allowVideo) {
      showToast("Video uploads are only available for staff", "error");
      return null;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      showToast(`Image too large (${humanSize(file.size)}). Max 5 MB.`, "error");
      return null;
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      showToast(`Video too large (${humanSize(file.size)}). Max 100 MB.`, "error");
      return null;
    }

    const currentImages = attachments.filter((a) => a.file_type === "image").length;
    if (isImage && currentImages >= MAX_IMAGES) {
      showToast(`Maximum ${MAX_IMAGES} images allowed`, "error");
      return null;
    }

    const currentVideos = attachments.filter((a) => a.file_type === "video").length;
    if (isVideo && currentVideos >= 1) {
      showToast("Only 1 video allowed per booking", "error");
      return null;
    }

    return isImage ? "image" : "video";
  }

  async function handleFiles(files) {
    if (!files?.length || !bookingId) return;

    for (const rawFile of files) {
      const fileType = validate(rawFile);
      if (!fileType) continue;

      setUploading(true);
      setUploadProgress(0);
      setUploadName(rawFile.name);

      try {
        let file = rawFile;
        if (fileType === "image") {
          setUploadProgress(10);
          file = await imageCompression(rawFile, COMPRESS_OPTS);
          setUploadProgress(40);
        } else {
          setUploadProgress(20);
        }

        await uploadBookingAttachment(bookingId, file);
        setUploadProgress(100);
        showToast(`${fileType === "image" ? "Image" : "Video"} uploaded`);
        await fetchAttachments();
      } catch (err) {
        console.error("Upload failed", err);
        showToast(err.message || "Upload failed", "error");
      } finally {
        setUploading(false);
        setUploadProgress(0);
        setUploadName("");
      }
    }
  }

  function openPicker() {
    if (!fileRef.current) return;
    fileRef.current.accept = allowVideo
      ? `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`
      : IMAGE_ACCEPT;
    fileRef.current.multiple = true;
    fileRef.current.click();
  }

  const images = attachments.filter((a) => a.file_type === "image");
  const videos = attachments.filter((a) => a.file_type === "video");

  const dropZoneStyle = {
    padding: compact ? "16px 14px" : "20px",
    borderRadius: 12,
    border: `1.5px dashed ${t.border}`,
    background: t.name === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,17,21,0.02)",
    textAlign: "center",
    cursor: uploading ? "wait" : "pointer",
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && openPicker()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && openPicker()}
        style={dropZoneStyle}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Loader2 size={22} style={{ color: t.accent, animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 13, color: t.textSecondary }}>{uploadName || "Uploading…"}</div>
            <div style={{ width: "80%" }}>
              <ProgressBar progress={uploadProgress} t={t} />
            </div>
          </div>
        ) : (
          <>
            <Upload size={22} style={{ color: t.textMuted, marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: t.textSecondary, fontWeight: 500 }}>
              Upload {allowVideo ? "images or video" : "images"}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
              Via secure API · max {MAX_IMAGES} images{allowVideo ? " · 1 video" : ""}
            </div>
          </>
        )}
      </div>

      {loading && (
        <div style={{ marginTop: 12, fontSize: 12, color: t.textMuted }}>Loading…</div>
      )}

      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
            gap: 8,
            marginTop: 14,
          }}
        >
          {images.map((att) => (
            <button
              key={att.id}
              type="button"
              onClick={() => att.url && setLightboxSrc(att.url)}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${t.border}`,
                padding: 0,
                cursor: att.url ? "zoom-in" : "default",
                background: t.cardBg2,
              }}
            >
              {att.url ? (
                <img src={att.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImageIcon size={20} style={{ color: t.textMuted }} />
              )}
              {att.url && (
                <span
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ZoomIn size={12} color="#fff" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {videos.map((att) => (
            <a
              key={att.id}
              href={att.url || undefined}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                background: t.cardBg2,
                color: t.textPrimary,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              <Film size={16} style={{ color: t.textMuted }} />
              <span style={{ flex: 1 }}>Video attachment</span>
              <Play size={14} style={{ color: t.textMuted }} />
            </a>
          ))}
        </div>
      )}

      {!loading && attachments.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: t.textMuted }}>No attachments yet</div>
      )}

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {/* role unused after API proxy — keep prop for call-site compat */}
      <span style={{ display: "none" }}>{role}</span>
    </div>
  );
}
