import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Film, ZoomIn, Play, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
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
const SIGNED_URL_EXPIRY = 3600;

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
 * @param {object} props
 * @param {string} props.bookingId - UUID of the booking
 * @param {"customer"|"staff"|"manager"|"owner"} props.role - uploader role
 * @param {boolean} [props.allowVideo] - allow video uploads (staff/manager/owner only)
 * @param {boolean} [props.compact] - compact mode for customer form
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
      const { data, error } = await supabase
        .from("booking_attachments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const withUrls = await Promise.all(
        (data || []).map(async (att) => {
          const bucket = att.file_type === "video" ? "booking-videos" : "booking-images";
          const { data: signed, error: signErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(att.file_path, SIGNED_URL_EXPIRY);
          return {
            ...att,
            url: signErr ? null : signed?.signedUrl,
          };
        })
      );
      setAttachments(withUrls);
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
          setUploadProgress(30);
        }

        const ext = rawFile.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
        const bucket = fileType === "video" ? "booking-videos" : "booking-images";

        setUploadProgress(fileType === "image" ? 40 : 10);

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadErr) throw uploadErr;
        setUploadProgress(80);

        const { error: insertErr } = await supabase.from("booking_attachments").insert({
          booking_id: bookingId,
          uploaded_by_role: role,
          file_path: path,
          file_type: fileType,
          mime_type: file.type,
          size_bytes: file.size,
        });

        if (insertErr) throw insertErr;
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
    transition: "border-color 150ms ease",
  };

  return (
    <div>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />

      {/* Upload zone */}
      <div
        style={dropZoneStyle}
        onClick={() => !uploading && openPicker()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = t.accent;
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = t.border;
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = t.border;
          if (!uploading) handleFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {uploading ? (
          <div>
            <Loader2
              size={20}
              strokeWidth={2}
              color={t.accent}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8 }}>
              Uploading {uploadName}…
            </div>
            <ProgressBar progress={uploadProgress} t={t} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div>
            <Upload size={20} strokeWidth={1.75} color={t.textMuted} />
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8 }}>
              {compact ? "Tap to add photos" : "Drop files or click to upload"}
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
              {allowVideo
                ? `Images (jpg/png/webp, max 5 MB each, up to ${MAX_IMAGES}) · Video (mp4/mov, max 100 MB, 1)`
                : `Images only · jpg/png/webp · max 5 MB each · up to ${MAX_IMAGES}`}
            </div>
          </div>
        )}
      </div>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
            gap: 8,
            marginTop: 12,
          }}
        >
          {images.map((att) => (
            <div
              key={att.id}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${t.border}`,
                cursor: att.url ? "pointer" : "default",
                background: t.name === "dark" ? "rgba(255,255,255,0.04)" : "rgba(15,17,21,0.04)",
              }}
              onClick={() => att.url && setLightboxSrc(att.url)}
            >
              {att.url ? (
                <img
                  src={att.url}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageIcon size={20} color={t.textMuted} />
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.25)",
                  opacity: 0,
                  transition: "opacity 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                <ZoomIn size={18} color="#fff" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {videos.map((att) => (
        <div
          key={att.id}
          style={{
            marginTop: 12,
            borderRadius: 10,
            overflow: "hidden",
            border: `1px solid ${t.border}`,
            background: "#000",
          }}
        >
          {att.url ? (
            <video
              controls
              preload="metadata"
              style={{ width: "100%", display: "block", maxHeight: 300 }}
            >
              <source src={att.url} type={att.mime_type} />
            </video>
          ) : (
            <div
              style={{
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "#888",
                fontSize: 13,
              }}
            >
              <Film size={18} />
              Video unavailable
            </div>
          )}
        </div>
      ))}

      {/* Loading state */}
      {loading && attachments.length === 0 && (
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 10, textAlign: "center" }}>
          Loading attachments…
        </div>
      )}
    </div>
  );
}
