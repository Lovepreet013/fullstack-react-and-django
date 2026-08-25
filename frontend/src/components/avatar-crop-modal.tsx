import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "../utils/cropImage";
import { getCroppedImg } from "../utils/cropImage";

interface AvatarCropModalProps {
  imageSrc: string;
  originalFile: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export default function AvatarCropModal({ imageSrc, originalFile, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) {
      setError("Please select a crop area.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      // keep original file type if allowed, otherwise jpeg
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      let fileType: string = originalFile.type;
      if (!allowedTypes.includes(fileType)) fileType = "image/jpeg";
      // normalize jpg
      if (fileType === "image/jpg") fileType = "image/jpeg";
      const fileName = originalFile.name || "avatar.jpg";

      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, fileName, fileType);

      if (croppedFile.size > 2 * 1024 * 1024) {
        setError("Cropped image must be smaller than 2MB. Try a smaller crop area.");
        setProcessing(false);
        return;
      }

      onConfirm(croppedFile);
    } catch {
      setError("Failed to crop image. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box crop-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h5>Crop avatar</h5>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            // free aspect – no aspect prop = freely resizable in every ratio
            cropShape="rect"
            showGrid={true}
            objectFit="contain"
            restrictPosition={false}
          />
        </div>

        <div className="crop-controls">
          <label htmlFor="zoom" className="card-meta" style={{ whiteSpace: "nowrap" }}>Zoom</label>
          <input
            id="zoom"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="zoom-slider"
            disabled={processing}
          />
        </div>

        {error && <div className="field-error" style={{ padding: "10px 16px" }}>{error}</div>}

        <div className="modal-footer">
          <button className="btn btn-delete" onClick={onCancel} disabled={processing} style={{ padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 999 }}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleConfirm} disabled={processing}>
            {processing ? "Cropping..." : "Confirm crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
