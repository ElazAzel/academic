"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { 
  Award, 
  ArrowLeft, 
  UploadCloud, 
  Move, 
  RotateCcw, 
  Save, 
  Sliders, 
  Grid,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Undo2,
  Redo2,
  ZoomIn,
  Eye,
  EyeOff,
  Layers,
  Palette,
  Leaf,
  Sparkle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCertificateTemplateAction, saveCertificateTemplateAction } from "@/server/actions/certificates";
import { useDesignHistory } from "@/lib/certificate-design-history";

interface ElementStyle {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  zIndex: number;
}

interface QrStyle {
  x: number;
  y: number;
  size: number;
  zIndex: number;
}

interface TemplateConfig {
  backgroundUrl: string;
  studentName: ElementStyle;
  courseTitle: ElementStyle;
  durationHours: ElementStyle;
  serialNumber: ElementStyle;
  issuedAt: ElementStyle;
  qrCode: QrStyle;
}

const FIELD_Z_BASE: Record<string, number> = {
  studentName: 30,
  courseTitle: 20,
  durationHours: 10,
  serialNumber: 5,
  issuedAt: 4,
  qrCode: 50,
};

const VISIBILITY_DEFAULTS: Record<string, boolean> = {
  studentName: true,
  courseTitle: true,
  durationHours: true,
  serialNumber: true,
  issuedAt: true,
  qrCode: true,
};

const PRESET_THEMES = [
  {
    name: "academic",
    label: "Академический",
    icon: "🎓",
    colors: { studentName: "#1c376f", courseTitle: "#1a1a1a", durationHours: "#333333", serialNumber: "#808080", issuedAt: "#808080" },
  },
  {
    name: "premium",
    label: "Премиум",
    icon: "👑",
    colors: { studentName: "#d4af37", courseTitle: "#1a1a1a", durationHours: "#555555", serialNumber: "#999999", issuedAt: "#999999" },
  },
  {
    name: "nature",
    label: "Природа",
    icon: "leaf",
    colors: { studentName: "#166534", courseTitle: "#1a1a1a", durationHours: "#333333", serialNumber: "#808080", issuedAt: "#808080" },
  },
  {
    name: "modern",
    label: "Современный",
    icon: "sparkle",
    colors: { studentName: "#0f172a", courseTitle: "#334155", durationHours: "#475569", serialNumber: "#94a3b8", issuedAt: "#94a3b8" },
  },
];

const DEFAULT_CONFIG: TemplateConfig = {
  backgroundUrl: "",
  studentName: { x: 421, y: 360, fontSize: 42, color: "#1c376f", align: "center", zIndex: FIELD_Z_BASE.studentName },
  courseTitle: { x: 421, y: 280, fontSize: 24, color: "#1a1a1a", align: "center", zIndex: FIELD_Z_BASE.courseTitle },
  durationHours: { x: 421, y: 200, fontSize: 14, color: "#333333", align: "center", zIndex: FIELD_Z_BASE.durationHours },
  serialNumber: { x: 60, y: 60, fontSize: 10, color: "#808080", align: "left", zIndex: FIELD_Z_BASE.serialNumber },
  issuedAt: { x: 60, y: 45, fontSize: 10, color: "#808080", align: "left", zIndex: FIELD_Z_BASE.issuedAt },
  qrCode: { x: 620, y: 120, size: 100, zIndex: FIELD_Z_BASE.qrCode },
};

const CERTIFICATE_BACKGROUND_MAX_BYTES = 5 * 1024 * 1024;
const PNG_CONTENT_TYPE = "image/png";

const PRESET_COLORS = [
  { value: "#1c376f", label: "Синий флотский" },
  { value: "#1a1a1a", label: "Глубокий черный" },
  { value: "#d4af37", label: "Классическое золото" },
  { value: "#808080", label: "Стальной серый" },
  { value: "#10b981", label: "Изумрудный зеленый" },
  { value: "#ef4444", label: "Гранатовый красный" },
];

type FieldKey = "studentName" | "courseTitle" | "durationHours" | "serialNumber" | "issuedAt" | "qrCode";

interface CertificateDesignerProps {
  courseId: string;
  backUrl: string;
}

interface CoursePreview {
  id: string;
  title: string;
  durationHours: number | null;
}

type TextFieldKey = Exclude<FieldKey, "qrCode">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readAlign(value: unknown, fallback: ElementStyle["align"]) {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function readElementStyle(value: unknown, fallback: ElementStyle): ElementStyle {
  const record = isRecord(value) ? value : {};
  return {
    x: readNumber(record.x, fallback.x),
    y: readNumber(record.y, fallback.y),
    fontSize: readNumber(record.fontSize, fallback.fontSize),
    color: readString(record.color, fallback.color),
    align: readAlign(record.align, fallback.align),
    zIndex: readNumber(record.zIndex, fallback.zIndex),
  };
}

function readQrStyle(value: unknown, fallback: QrStyle): QrStyle {
  const record = isRecord(value) ? value : {};
  return {
    x: readNumber(record.x, fallback.x),
    y: readNumber(record.y, fallback.y),
    size: readNumber(record.size, fallback.size),
    zIndex: readNumber(record.zIndex, fallback.zIndex),
  };
}

function applyConfigFromBody(body: Record<string, unknown>, fallback: TemplateConfig): TemplateConfig {
  const config: TemplateConfig = {
    backgroundUrl: readString(body.backgroundUrl, ""),
    studentName: readElementStyle(body.studentName, fallback.studentName),
    courseTitle: readElementStyle(body.courseTitle, fallback.courseTitle),
    durationHours: readElementStyle(body.durationHours, fallback.durationHours),
    serialNumber: readElementStyle(body.serialNumber, fallback.serialNumber),
    issuedAt: readElementStyle(body.issuedAt, fallback.issuedAt),
    qrCode: readQrStyle(body.qrCode, fallback.qrCode),
  };
  // Backward compat: if body has no zIndex, assign from FIELD_Z_BASE
  for (const key of Object.keys(FIELD_Z_BASE)) {
    if (key === "qrCode") {
      if (typeof config.qrCode.zIndex === "undefined") config.qrCode.zIndex = FIELD_Z_BASE.qrCode;
    } else {
      const el = config[key as TextFieldKey];
      if (el && typeof el.zIndex === "undefined") el.zIndex = FIELD_Z_BASE[key];
    }
  }
  return config;
}

class CertificateDesignerUserError extends Error {}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof CertificateDesignerUserError ? error.message : fallback;
}

async function readUploadPublicUrl(response: Response, fallback: string): Promise<string> {
  const responseType = response.headers.get("content-type") ?? "";
  if (!responseType.includes("application/json")) return fallback;

  const body = await response.json().catch(() => null);
  return isRecord(body) && typeof body.publicUrl === "string" ? body.publicUrl : fallback;
}

function readUploadTicketPayload(payload: unknown): { url: string; publicUrl: string; fallbackUrl?: string } {
  const envelope = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(envelope) || typeof envelope.url !== "string" || typeof envelope.publicUrl !== "string") {
    throw new CertificateDesignerUserError("Некорректный ответ сервера загрузки");
  }

  return {
    url: envelope.url,
    publicUrl: envelope.publicUrl,
    fallbackUrl: typeof envelope.fallbackUrl === "string" ? envelope.fallbackUrl : undefined,
  };
}

async function uploadCertificateBackgroundFile(url: string, file: File, contentType: string, publicUrl: string): Promise<string> {
  const uploadRes = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!uploadRes.ok) throw new CertificateDesignerUserError("Не удалось загрузить файл в облако");

  return readUploadPublicUrl(uploadRes, publicUrl);
}

export function CertificateDesigner({ courseId, backUrl }: CertificateDesignerProps) {
  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [activeField, setActiveField] = useState<FieldKey>("studentName");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Zoom state (50% – 150%)
  const [zoom, setZoom] = useState(1);

  // Auto-save state
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Undo/redo history
  const { push: pushState, undo, redo, canUndo, canRedo } = useDesignHistory<TemplateConfig>(DEFAULT_CONFIG);

  // Visibility toggles
  const [visibility, setVisibility] = useState<Record<string, boolean>>(VISIBILITY_DEFAULTS);

  function isFieldVisible(key: FieldKey): boolean {
    return visibility[key] ?? true;
  }

  function toggleFieldVisibility(key: FieldKey) {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Smooth visual constructor states
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Live preview scaling
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCertificateTemplateAction(courseId);
      setCourse(res.course);
      if (res.template && isRecord(res.template.body)) {
        const body = res.template.body;
        setConfig(applyConfigFromBody(body, DEFAULT_CONFIG));
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Ошибка при получении шаблона"));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    function handleResize() {
      if (previewContainerRef.current) {
        const width = previewContainerRef.current.clientWidth;
        setScale(width / 842);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loading]);

  // Auto-save: debounce config changes (3s after last change)
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await saveCertificateTemplateAction(courseId, configRef.current);
      } catch {
        // silent — errors shown on manual save
      } finally {
        setAutoSaving(false);
      }
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [config, courseId]);

  // Push history on config changes (debounced)
  const lastPushedRef = useRef<string>("");
  useEffect(() => {
    const serialized = JSON.stringify(config);
    if (serialized !== lastPushedRef.current) {
      pushState(config);
      lastPushedRef.current = serialized;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Ctrl+Z / Ctrl+Shift+Z shortcuts
  useEffect(() => {
    function handleKeyboardShortcut(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const prev = undo();
        if (prev) setConfig(prev);
      } else if (e.ctrlKey && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const next = redo();
        if (next) setConfig(next);
      } else if (e.ctrlKey && e.key === "Z" && !e.shiftKey) {
        e.preventDefault();
        const prev = undo();
        if (prev) setConfig(prev);
      } else if (e.ctrlKey && e.key === "Z" && e.shiftKey) {
        e.preventDefault();
        const next = redo();
        if (next) setConfig(next);
      }
    }
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [undo, redo]);

  // Nudge active element via Keyboard Arrows (1px, or 10px with Shift)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!activeField) return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      if (e.key === "ArrowLeft") {
        deltaX = -step;
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        deltaX = step;
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        deltaY = step;
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        deltaY = -step;
        e.preventDefault();
      }

      if (deltaX !== 0 || deltaY !== 0) {
        const current = config[activeField];
        let nextX = Math.round(current.x + deltaX);
        let nextY = Math.round(current.y + deltaY);

        nextX = Math.max(0, Math.min(842, nextX));
        nextY = Math.max(0, Math.min(595, nextY));

        updateStyle(activeField, { x: nextX, y: nextY });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeField, config]);

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPng = file.type === PNG_CONTENT_TYPE || file.name.toLowerCase().endsWith(".png");
    if (!isPng) {
      setError("Разрешены только PNG фоны для сертификатов.");
      e.currentTarget.value = "";
      return;
    }

    if (file.size > CERTIFICATE_BACKGROUND_MAX_BYTES) {
      setError("PNG-фон не должен превышать 5 MB.");
      e.currentTarget.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    const contentType = file.type || PNG_CONTENT_TYPE;

    try {
      const res = await fetch("/api/v1/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          fileSize: file.size,
          prefix: "certificates",
        }),
      });

      if (!res.ok) throw new CertificateDesignerUserError("Не удалось создать ссылку для загрузки");
      const { url, publicUrl, fallbackUrl } = readUploadTicketPayload(await res.json());

      let uploadRes: Response;
      try {
        uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });
      } catch (uploadError) {
        if (!fallbackUrl || fallbackUrl === url) {
          throw uploadError;
        }
        const uploadedPublicUrl = await uploadCertificateBackgroundFile(fallbackUrl, file, contentType, publicUrl);
        setConfig(prev => ({ ...prev, backgroundUrl: uploadedPublicUrl }));
        setSuccess("Фоновый PNG успешно загружен!");
        setTimeout(() => setSuccess(null), 3000);
        return;
      }

      if (!uploadRes.ok) {
        if (fallbackUrl && fallbackUrl !== url) {
          const uploadedPublicUrl = await uploadCertificateBackgroundFile(fallbackUrl, file, contentType, publicUrl);
          setConfig(prev => ({ ...prev, backgroundUrl: uploadedPublicUrl }));
          setSuccess("Фоновый PNG успешно загружен!");
          setTimeout(() => setSuccess(null), 3000);
          return;
        }
        throw new CertificateDesignerUserError("Не удалось загрузить файл в облако");
      }

      const uploadedPublicUrl = await readUploadPublicUrl(uploadRes, publicUrl);
      setConfig(prev => ({ ...prev, backgroundUrl: uploadedPublicUrl }));
      setSuccess("Фоновый PNG успешно загружен!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "Не удалось загрузить фоновое изображение"));
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveCertificateTemplateAction(courseId, config);
      setSuccess("Шаблон сертификата успешно сохранен!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, "Ошибка при сохранении шаблона"));
    } finally {
      setSaving(false);
    }
  }

  const [previewing, setPreviewing] = useState(false);

  async function handlePreviewPdf() {
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/certificates/designer/${courseId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        throw new CertificateDesignerUserError("Не удалось сгенерировать предпросмотр PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(getErrorMessage(err, "Ошибка при генерации предпросмотра"));
    } finally {
      setPreviewing(false);
    }
  }

  function handleReset() {
    if (confirm("Вы уверены, что хотите сбросить дизайн до настроек по умолчанию?")) {
      setConfig(DEFAULT_CONFIG);
    }
  }

  function updateStyle(field: FieldKey, updates: Partial<ElementStyle & QrStyle>) {
    if (field === "qrCode") {
      setConfig(prev => ({
        ...prev,
        qrCode: {
          ...prev.qrCode,
          x: updates.x ?? prev.qrCode.x,
          y: updates.y ?? prev.qrCode.y,
          size: updates.size ?? prev.qrCode.size,
          zIndex: updates.zIndex ?? prev.qrCode.zIndex,
        },
      }));
      return;
    }

    setConfig(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        x: updates.x ?? prev[field].x,
        y: updates.y ?? prev[field].y,
        fontSize: updates.fontSize ?? prev[field].fontSize,
        color: updates.color ?? prev[field].color,
        align: updates.align ?? prev[field].align,
        zIndex: updates.zIndex ?? prev[field].zIndex,
      },
    }));
  }

  // Layer movement
  function moveLayer(field: FieldKey, direction: "up" | "down") {
    const delta = direction === "up" ? 1 : -1;
    if (field === "qrCode") {
      updateStyle(field, { zIndex: config.qrCode.zIndex + delta });
    } else {
      updateStyle(field, { zIndex: (config[field] as ElementStyle).zIndex + delta });
    }
  }

  // Apply preset theme
  function applyTheme(theme: typeof PRESET_THEMES[number]) {
    setConfig(prev => {
      const next = { ...prev };
      for (const [fieldKey, color] of Object.entries(theme.colors)) {
        if (fieldKey === "qrCode") continue;
        const fk = fieldKey as TextFieldKey;
        if (fk in next) {
          next[fk] = { ...next[fk], color };
        }
      }
      return next;
    });
  }

  // Pointer dragging handler inside preview container
  const activeDragRef = useRef<{ field: FieldKey; startX: number; startY: number; startElementX: number; startElementY: number } | null>(null);

  function handleDragStart(field: FieldKey, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const element = config[field];
    activeDragRef.current = {
      field,
      startX: e.clientX,
      startY: e.clientY,
      startElementX: element.x,
      startElementY: element.y,
    };
    setActiveField(field);
    setIsDragging(true);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeDragRef.current) return;
    const drag = activeDragRef.current;
    
    // Scale movement according to current preview width scaling
    const deltaX = (e.clientX - drag.startX) / scale;
    const deltaY = (e.clientY - drag.startY) / scale;

    // pdf-lib Y goes from bottom to top, so moving cursor DOWN decreases Y, moving cursor UP increases Y
    let nextX = Math.round(drag.startElementX + deltaX);
    let nextY = Math.round(drag.startElementY - deltaY); // reversed delta because Y starts from bottom

    // Apply smart grid alignment/snapping and center guidance magnetism
    if (snapToGrid) {
      if (Math.abs(nextX - 421) < 8) {
        nextX = 421; // Snap horizontally to perfect center
      } else {
        nextX = Math.round(nextX / 10) * 10;
      }
      nextY = Math.round(nextY / 10) * 10;
    }

    // Bound values inside page bounds
    nextX = Math.max(0, Math.min(842, nextX));
    nextY = Math.max(0, Math.min(595, nextY));

    updateStyle(drag.field, { x: nextX, y: nextY });
  }

  function handleDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!activeDragRef.current) return;
    const target = e.currentTarget;
    target.releasePointerCapture(e.pointerId);
    activeDragRef.current = null;
    setIsDragging(false);
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Загрузка конструктора...</span>
      </div>
    );
  }

  const currentFieldStyle = config[activeField];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" asChild size="sm">
            <a href={backUrl}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </a>
          </Button>

          {/* Undo / Redo */}
          <Button variant="secondary" onClick={() => { const prev = undo(); if (prev) setConfig(prev); }} disabled={!canUndo} size="sm" title="Отменить (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => { const next = redo(); if (next) setConfig(next); }} disabled={!canRedo} size="sm" title="Повторить (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <span className="text-xs text-muted-foreground mx-1 hidden md:inline">|</span>

          {/* Zoom */}
          <div className="flex items-center gap-1" title="Масштаб холста">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <input
              type="range"
              min={50}
              max={150}
              value={Math.round(zoom * 100)}
              onChange={(e) => setZoom(Number(e.target.value) / 100)}
              className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-muted-foreground w-8 tabular-nums">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {autoSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Автосохранение...
            </span>
          )}
          <Button variant="secondary" onClick={handleReset} size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
          <Button variant="secondary" onClick={handlePreviewPdf} disabled={previewing} size="sm">
            {previewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
            PDF
          </Button>
          <Button onClick={handleSave} disabled={saving || autoSaving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Live Editor Canvas (842 x 595 landscape) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-lg overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="text-primary h-5 w-5" />
                    <span>Интерактивный холст (Drag & Drop)</span>
                  </CardTitle>
                  <CardDescription>
                    Перетаскивайте элементы прямо на холст или тонко настраивайте их положение стрелками клавиатуры.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant={showGrid ? "primary" : "secondary"}
                    onClick={() => setShowGrid(!showGrid)}
                    title="Вспомогательная сетка и печатная рамка безопасности"
                  >
                    <Grid className="h-4 w-4 mr-1" />
                    {showGrid ? "Сетка: Вкл" : "Сетка: Выкл"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant={snapToGrid ? "primary" : "secondary"}
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    title="Примагничивать элементы к шагу сетки и центру холста"
                  >
                    <Sliders className="h-4 w-4 mr-1" />
                    {snapToGrid ? "Магнит: Вкл" : "Магнит: Выкл"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex justify-center">
              <div 
                ref={previewContainerRef}
                className="w-full max-w-[842px] border relative bg-m3-surface-container-low shadow-sm rounded-lg overflow-hidden select-none"
                style={{
                  aspectRatio: "842 / 595",
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  height: zoom > 1 ? `${595 * zoom}px` : "auto",
                }}
              >
                {/* Visual Background Image Layer */}
                {config.backgroundUrl && (
                  <Image 
                    src={config.backgroundUrl} 
                    alt="Фон сертификата" 
                    fill
                    className="!absolute inset-0 !w-full !h-full object-fill pointer-events-none select-none"
                    priority={false}
                  />
                )}
                {/* Visual Grid Lines overlay */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                      backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
                      backgroundSize: `${(10 / 842) * 100}% ${(10 / 595) * 100}%`,
                    }}
                  />
                )}

                {/* Printable safe margins boundaries overlay */}
                {showGrid && (
                  <div 
                    className="absolute pointer-events-none border border-dashed border-rose-500/20"
                    style={{
                      left: `${(40 / 842) * 100}%`,
                      right: `${(40 / 842) * 100}%`,
                      top: `${(40 / 595) * 100}%`,
                      bottom: `${(40 / 595) * 100}%`,
                    }}
                  />
                )}

                {/* Snapping magnetic center line overlay */}
                {showGrid && (
                  <div 
                    className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 border-l border-dashed border-amber-500/30 pointer-events-none z-10"
                  />
                )}

                {/* Fallback elegant border grid if background is not uploaded */}
                {!config.backgroundUrl && (
                  <div className="absolute inset-0 border-8 border-slate-700 flex flex-col justify-between p-6 bg-slate-50">
                    <div className="w-full h-full border-2 border-dashed border-amber-600/30 rounded-md flex flex-col items-center justify-center text-slate-400">
                      <Grid className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs">Фоновое изображение по умолчанию</p>
                    </div>
                  </div>
                )}

                {/* Draggable fields overlays */}
                {(["studentName", "courseTitle", "durationHours", "serialNumber", "issuedAt"] as TextFieldKey[]).map(field => {
                  if (!isFieldVisible(field)) return null;
                  const s = config[field] as ElementStyle;
                  const label = field === "studentName" 
                    ? "Иванов Иван Иванович" 
                    : field === "courseTitle"
                      ? (course?.title || "Название учебной программы")
                      : field === "durationHours"
                        ? `Количество часов: ${course?.durationHours || 72}`
                        : field === "serialNumber"
                          ? "Номер: AC-2026-987"
                          : "Дата выдачи: 2026-05-23";

                  const isActive = activeField === field;

                  return (
                    <div
                      key={field}
                      onPointerDown={(e) => handleDragStart(field, e)}
                      onPointerMove={handleDragMove}
                      onPointerUp={handleDragEnd}
                      className={`absolute cursor-move select-none p-1 rounded border transition-all duration-150 ${
                        isActive 
                          ? "border-amber-500 bg-amber-500/10 shadow-md scale-[1.01] ring-2 ring-amber-500/25" 
                          : "border-transparent hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                      style={{
                        left: `${(s.x / 842) * 100}%`,
                        bottom: `${(s.y / 595) * 100}%`,
                        transform: s.align === "center" ? "translateX(-50%)" : s.align === "right" ? "translateX(-100%)" : "none",
                        fontSize: `${s.fontSize * scale}px`,
                        color: s.color,
                        fontFamily: isActive ? "sans-serif" : "inherit",
                        fontWeight: field === "studentName" || field === "courseTitle" ? "bold" : "normal",
                        fontStyle: field === "studentName" ? "normal" : "inherit",
                        zIndex: s.zIndex,
                      }}
                    >
                      <span className="flex items-center gap-1 relative whitespace-nowrap">
                        {isActive && <Move className="h-3 w-3 inline text-amber-500 animate-pulse" style={{ transform: `scale(${1 / scale})` }} />}
                        {label}

                        {/* Drag coordinates visual tooltip */}
                        {isDragging && isActive && (
                          <span 
                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 font-mono"
                            style={{ transform: `scale(${Math.max(1, 1 / scale)})` }}
                          >
                            X: {s.x} Y: {s.y}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Draggable QR-code */}
                {isFieldVisible("qrCode") && (
                <div
                  onPointerDown={(e) => handleDragStart("qrCode", e)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  className={`absolute cursor-move border select-none p-1 flex items-center justify-center bg-white transition-all duration-150 ${
                    activeField === "qrCode" 
                      ? "border-amber-500 bg-amber-500/10 shadow-md scale-[1.01] ring-2 ring-amber-500/25" 
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                  style={{
                    left: `${(config.qrCode.x / 842) * 100}%`,
                    bottom: `${(config.qrCode.y / 595) * 100}%`,
                    width: `${config.qrCode.size * scale}px`,
                    height: `${config.qrCode.size * scale}px`,
                    zIndex: config.qrCode.zIndex,
                  }}
                >
                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-1 border relative">
                    <Grid className="w-full h-full text-slate-700" />
                    <span className="text-[6px] text-slate-400 absolute bottom-0 bg-white/95 px-1 truncate">QR-код</span>

                    {/* QR coordinates visual tooltip */}
                    {isDragging && activeField === "qrCode" && (
                      <span 
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-1.5 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-50 font-mono"
                        style={{ transform: `scale(${Math.max(1, 1 / scale)})` }}
                      >
                        X: {config.qrCode.x} Y: {config.qrCode.y}
                      </span>
                    )}
                  </div>
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Inspector Panel */}
        <div className="space-y-4">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UploadCloud className="text-primary h-5 w-5" />
                <span>Загрузить фон (PNG)</span>
              </CardTitle>
              <CardDescription>
                Для правильного позиционирования загрузите изображение горизонтального формата 842x595 пикселей.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/20">
                <Label htmlFor="bg-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full text-center">
                  <UploadCloud className="h-8 w-8 text-muted-foreground animate-bounce" />
                  <span className="text-sm font-medium">{uploading ? "Загрузка файла..." : "Выберите PNG файл"}</span>
                  <span className="text-xs text-muted-foreground">Макс. 5 MB</span>
                  <input 
                    id="bg-upload" 
                    type="file" 
                    accept=".png" 
                    className="hidden" 
                    onChange={handleBgUpload} 
                    disabled={uploading}
                  />
                </Label>
              </div>
              {config.backgroundUrl && (
                <div className="text-xs text-muted-foreground truncate border rounded-lg p-2 bg-slate-50">
                  <strong>Активный фон:</strong> {config.backgroundUrl}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preset Themes */}
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="text-primary h-5 w-5" />
                <span>Готовые темы оформления</span>
              </CardTitle>
              <CardDescription>
                Быстро сменить цветовую схему всех текстовых полей.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_THEMES.map(theme => (
                  <button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:bg-muted/20 transition-colors"
                    title={theme.label}
                  >
                    {theme.icon === "leaf" ? <Leaf className="h-5 w-5 text-m3-primary" /> : <Sparkle className="h-5 w-5 text-m3-primary" />}
                    <span className="text-xs font-medium">{theme.label}</span>
                    <div className="flex gap-0.5 mt-1">
                      {Object.values(theme.colors).map((c, i) => (
                        <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Layers Panel */}
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="text-primary h-5 w-5" />
                <span>Слои и видимость</span>
              </CardTitle>
              <CardDescription>
                Управляйте порядком слоёв и видимостью элементов на холсте.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 max-h-64 overflow-y-auto">
              {([["studentName", "ФИО"], ["courseTitle", "Курс"], ["durationHours", "Часы"], ["serialNumber", "Номер"], ["issuedAt", "Дата"], ["qrCode", "QR-код"]] as const).map(([key, label]) => {
                const el = key === "qrCode" ? config.qrCode : config[key];
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/20 transition-colors">
                    <button
                      onClick={() => toggleFieldVisibility(key as FieldKey)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={isFieldVisible(key as FieldKey) ? "Скрыть" : "Показать"}
                    >
                      {isFieldVisible(key as FieldKey) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground/50" />}
                    </button>
                    <span className={`text-sm flex-1 ml-2 ${!isFieldVisible(key as FieldKey) ? "line-through text-muted-foreground/50" : ""}`}>
                      {label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">{el.zIndex}</span>
                    <div className="flex gap-0.5 ml-2">
                      <button
                        onClick={() => moveLayer(key as FieldKey, "up")}
                        className="text-muted-foreground hover:text-foreground text-xs px-1"
                        title="Выше"
                      >▲</button>
                      <button
                        onClick={() => moveLayer(key as FieldKey, "down")}
                        className="text-muted-foreground hover:text-foreground text-xs px-1"
                        title="Ниже"
                      >▼</button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="text-amber-500 h-5 w-5" />
                <span>Панель свойств элемента</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold">Выберите элемент для редактирования:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {[
                    { key: "studentName", label: "ФИО" },
                    { key: "courseTitle", label: "Название курса" },
                    { key: "durationHours", label: "Количество часов" },
                    { key: "serialNumber", label: "Номер" },
                    { key: "issuedAt", label: "Дата выдачи" },
                    { key: "qrCode", label: "QR-код" },
                  ].map(f => (
                    <Button 
                      key={f.key} 
                      size="sm"
                      variant={activeField === f.key ? "primary" : "secondary"} 
                      onClick={() => setActiveField(f.key as FieldKey)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Координата X</Label>
                    <Input 
                      type="number" 
                      value={currentFieldStyle.x}
                      onChange={(e) => updateStyle(activeField, { x: Number(e.target.value) })}
                      min={0}
                      max={842}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Координата Y (от низа холста)</Label>
                    <Input 
                      type="number" 
                      value={currentFieldStyle.y}
                      onChange={(e) => updateStyle(activeField, { y: Number(e.target.value) })}
                      min={0}
                      max={595}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>X: {currentFieldStyle.x}px</span>
                    <span>Y: {currentFieldStyle.y}px</span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={842} 
                    value={currentFieldStyle.x} 
                    onChange={(e) => updateStyle(activeField, { x: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="range" 
                    min={0} 
                    max={595} 
                    value={currentFieldStyle.y} 
                    onChange={(e) => updateStyle(activeField, { y: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                </div>

                {activeField !== "qrCode" ? (
                  <>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <Label>Размер шрифта</Label>
                        <span className="font-semibold">{config[activeField].fontSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min={8} 
                        max={72} 
                        value={config[activeField].fontSize}
                        onChange={(e) => updateStyle(activeField, { fontSize: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Выравнивание текста</Label>
                      <div className="flex gap-2 mt-1">
                        {(["left", "center", "right"] as const).map(align => (
                          <Button
                            key={align}
                            size="sm"
                            variant={config[activeField].align === align ? "primary" : "secondary"}
                            onClick={() => updateStyle(activeField, { align })}
                            className="flex-1 capitalize"
                          >
                            {align === "left" ? "Слева" : align === "center" ? "Центр" : "Справа"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Цвет текста</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c.value}
                            onClick={() => updateStyle(activeField, { color: c.value })}
                            className={`w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform ${config[activeField].color === c.value ? "ring-2 ring-primary ring-offset-2" : ""}`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={config[activeField].color || "#000000"}
                          onChange={(e) => updateStyle(activeField, { color: e.target.value })}
                          className="w-6 h-6 border rounded cursor-pointer"
                          title="Выбрать свой цвет"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <Label>Размер QR-кода</Label>
                      <span className="font-semibold">{config.qrCode.size}px</span>
                    </div>
                    <input 
                      type="range" 
                      min={40} 
                      max={200} 
                      value={config.qrCode.size}
                      onChange={(e) => updateStyle(activeField, { size: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    </div>
                  )}
                  
                  {/* Z-Index slider for all fields */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <Label>Слой (z-index)</Label>
                      <span className="font-semibold font-mono">{currentFieldStyle.zIndex}</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={currentFieldStyle.zIndex}
                      onChange={(e) => updateStyle(activeField, { zIndex: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between gap-2 mt-1">
                      <Button size="sm" variant="secondary" onClick={() => moveLayer(activeField, "down")} className="flex-1 text-xs">▼ Назад</Button>
                      <Button size="sm" variant="secondary" onClick={() => moveLayer(activeField, "up")} className="flex-1 text-xs">▲ Вперёд</Button>
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
