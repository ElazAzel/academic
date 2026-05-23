"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Award, 
  ArrowLeft, 
  UploadCloud, 
  Move, 
  RotateCcw, 
  Palette, 
  HelpCircle, 
  Save, 
  Sliders, 
  Type, 
  Grid,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCertificateTemplateAction, saveCertificateTemplateAction } from "@/server/actions/certificates";

interface ElementStyle {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
}

interface QrStyle {
  x: number;
  y: number;
  size: number;
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

const DEFAULT_CONFIG: TemplateConfig = {
  backgroundUrl: "",
  studentName: { x: 421, y: 360, fontSize: 42, color: "#1c376f", align: "center" },
  courseTitle: { x: 421, y: 280, fontSize: 24, color: "#1a1a1a", align: "center" },
  durationHours: { x: 421, y: 200, fontSize: 14, color: "#333333", align: "center" },
  serialNumber: { x: 60, y: 60, fontSize: 10, color: "#808080", align: "left" },
  issuedAt: { x: 60, y: 45, fontSize: 10, color: "#808080", align: "left" },
  qrCode: { x: 620, y: 120, size: 100 },
};

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

export function CertificateDesigner({ courseId, backUrl }: CertificateDesignerProps) {
  const [course, setCourse] = useState<any>(null);
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [activeField, setActiveField] = useState<FieldKey>("studentName");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live preview scaling
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    loadTemplate();
  }, [courseId]);

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

  async function loadTemplate() {
    setLoading(true);
    setError(null);
    try {
      const res = await getCertificateTemplateAction(courseId);
      setCourse(res.course);
      if (res.template && res.template.body && typeof res.template.body === "object") {
        const body = res.template.body as any;
        // Merge with defaults to ensure complete config safety
        setConfig({
          backgroundUrl: body.backgroundUrl || "",
          studentName: { ...DEFAULT_CONFIG.studentName, ...body.studentName },
          courseTitle: { ...DEFAULT_CONFIG.courseTitle, ...body.courseTitle },
          durationHours: { ...DEFAULT_CONFIG.durationHours, ...body.durationHours },
          serialNumber: { ...DEFAULT_CONFIG.serialNumber, ...body.serialNumber },
          issuedAt: { ...DEFAULT_CONFIG.issuedAt, ...body.issuedAt },
          qrCode: { ...DEFAULT_CONFIG.qrCode, ...body.qrCode },
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    } catch (err: any) {
      setError(err.message || "Ошибка при получении шаблона");
    } finally {
      setLoading(false);
    }
  }

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("image/png")) {
      setError("Разрешены только PNG фоны для сертификатов.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          prefix: "certificates",
        }),
      });

      if (!res.ok) throw new Error("Не удалось создать ссылку для загрузки");
      const { url, publicUrl } = await res.json();

      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Не удалось загрузить файл в облако");

      setConfig(prev => ({ ...prev, backgroundUrl: publicUrl }));
      setSuccess("Фоновый PNG успешно загружен!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить фоновое изображение");
    } finally {
      setUploading(false);
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
    } catch (err: any) {
      setError(err.message || "Ошибка при сохранении шаблона");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (confirm("Вы уверены, что хотите сбросить дизайн до настроек по умолчанию?")) {
      setConfig(DEFAULT_CONFIG);
    }
  }

  function updateStyle(field: FieldKey, updates: Partial<ElementStyle & QrStyle>) {
    setConfig(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] as any),
        ...updates,
      },
    }));
  }

  // Pointer dragging handler inside preview container
  const activeDragRef = useRef<{ field: FieldKey; startX: number; startY: number; startElementX: number; startElementY: number } | null>(null);

  function handleDragStart(field: FieldKey, e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const element = config[field] as any;
    activeDragRef.current = {
      field,
      startX: e.clientX,
      startY: e.clientY,
      startElementX: element.x,
      startElementY: element.y,
    };
    setActiveField(field);
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
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">Загрузка конструктора...</span>
      </div>
    );
  }

  const currentFieldStyle = config[activeField] as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" asChild size="sm">
          <a href={backUrl}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </a>
        </Button>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Сбросить
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Сохранить шаблон
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Live Editor Canvas (842 x 595 landscape) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="text-primary h-5 w-5" />
                <span>Интерактивный холст (Drag & Drop)</span>
              </CardTitle>
              <CardDescription>
                Перетаскивайте элементы прямо на свидетельство мышью, чтобы точно отрегулировать координаты.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex justify-center">
              <div 
                ref={previewContainerRef}
                className="w-full max-w-[842px] aspect-[842/595] border relative bg-m3-surface-container-low shadow-sm rounded-xl overflow-hidden select-none"
                style={{ 
                  backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              >
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
                {(["studentName", "courseTitle", "durationHours", "serialNumber", "issuedAt"] as FieldKey[]).map(field => {
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
                      className={`absolute cursor-move select-none p-1 rounded border hover:bg-primary/5 transition-colors ${isActive ? "border-amber-500 bg-amber-500/10 z-20" : "border-transparent hover:border-slate-300"}`}
                      style={{
                        left: `${(s.x / 842) * 100}%`,
                        bottom: `${(s.y / 595) * 100}%`,
                        transform: s.align === "center" ? "translateX(-50%)" : s.align === "right" ? "translateX(-100%)" : "none",
                        fontSize: `${s.fontSize * scale}px`,
                        color: s.color,
                        fontFamily: isActive ? "sans-serif" : "inherit",
                        fontWeight: field === "studentName" || field === "courseTitle" ? "bold" : "normal",
                        fontStyle: field === "studentName" ? "normal" : "inherit"
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {isActive && <Move className="h-3 w-3 inline text-amber-500" style={{ transform: `scale(${1 / scale})` }} />}
                        {label}
                      </span>
                    </div>
                  );
                })}

                {/* Draggable QR-code */}
                <div
                  onPointerDown={(e) => handleDragStart("qrCode", e)}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  className={`absolute cursor-move border select-none p-1 flex items-center justify-center hover:bg-primary/5 bg-white ${activeField === "qrCode" ? "border-amber-500 bg-amber-500/10 z-20" : "border-slate-300"}`}
                  style={{
                    left: `${(config.qrCode.x / 842) * 100}%`,
                    bottom: `${(config.qrCode.y / 595) * 100}%`,
                    width: `${config.qrCode.size * scale}px`,
                    height: `${config.qrCode.size * scale}px`,
                  }}
                >
                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-1 border">
                    <Grid className="w-full h-full text-slate-700" />
                    <span className="text-[6px] text-slate-400 absolute bottom-0 bg-white/95 px-1 truncate">QR-код</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Inspector Panel */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
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
              <div className="flex items-center justify-center border-2 border-dashed rounded-xl p-6 bg-muted/20">
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

          <Card className="rounded-2xl">
            <CardHeader className="border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="text-amber-500 h-5 w-5" />
                <span>Панель свойств элемента</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-semibold">Выберите элемент для редактирования:</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
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
                <div className="grid grid-cols-2 gap-4">
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
                        <span className="font-semibold">{currentFieldStyle.fontSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min={8} 
                        max={72} 
                        value={currentFieldStyle.fontSize} 
                        onChange={(e) => updateStyle(activeField, { fontSize: Number(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Выравнивание текста</Label>
                      <div className="flex gap-2 mt-1">
                        {["left", "center", "right"].map(align => (
                          <Button
                            key={align}
                            size="sm"
                            variant={currentFieldStyle.align === align ? "primary" : "secondary"}
                            onClick={() => updateStyle(activeField, { align: align as any })}
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
                            className={`w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform ${currentFieldStyle.color === c.value ? "ring-2 ring-primary ring-offset-2" : ""}`}
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                        <input
                          type="color"
                          value={currentFieldStyle.color || "#000000"}
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
                      <span className="font-semibold">{currentFieldStyle.size}px</span>
                    </div>
                    <input 
                      type="range" 
                      min={40} 
                      max={200} 
                      value={currentFieldStyle.size} 
                      onChange={(e) => updateStyle(activeField, { size: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
