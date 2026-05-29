"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importUsersAction } from "@/server/actions/admin";
import { RoleKey } from "@prisma/client";
import { ROLE_LABELS } from "@/types/domain";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Loader2, 
  ArrowLeft, 
  Play, 
  PlusCircle,
  HelpCircle,
  Check
} from "lucide-react";

interface CohortSelectOption {
  id: string;
  name: string;
  course: {
    title: string;
  } | null;
}

interface ParsedUser {
  email: string;
  name: string;
  roleKeys: RoleKey[];
  isValid: boolean;
  error?: string;
  selected: boolean;
}

interface ImportResult {
  email: string;
  name: string;
  status: "created" | "enrolled" | "skipped" | "failed";
  tempPassword?: string;
  error?: string;
}

export function UserBatchImporter({
  assignableRoles,
  cohorts
}: {
  assignableRoles: RoleKey[];
  cohorts: CohortSelectOption[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [defaultRoles, setDefaultRoles] = useState<RoleKey[]>([RoleKey.student]);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV function
  const handleParse = (textToParse: string) => {
    const lines = textToParse.split(/\r?\n/);
    const parsed: ParsedUser[] = [];
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const parts = line.split(/[;,]/).map(p => p.trim());
      
      // Skip headers
      const col1 = parts[0].toLowerCase();
      if (col1 === "email" || col1 === "login" || col1 === "роль" || col1 === "role" || col1 === "почта") {
        continue;
      }
      
      const email = parts[0];
      const name = parts[1] || "";
      let roleKeys = [...defaultRoles];
      
      // If a role key is explicitly listed as 3rd column
      if (parts[2]) {
        const potentialRole = parts[2].toLowerCase() as RoleKey;
        if (assignableRoles.includes(potentialRole)) {
          roleKeys = [potentialRole];
        }
      }
      
      const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      
      parsed.push({
        email,
        name,
        roleKeys,
        isValid: isEmailValid,
        error: isEmailValid ? undefined : "Неверный формат email",
        selected: isEmailValid
      });
    }
    
    setParsedUsers(parsed);
    setStep(2);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  // Perform import
  const handleImport = async () => {
    const selectedToImport = parsedUsers.filter(u => u.selected && u.isValid);
    if (selectedToImport.length === 0) return;

    setLoading(true);
    try {
      const payload = selectedToImport.map(u => ({
        email: u.email,
        name: u.name || undefined,
        roleKeys: u.roleKeys
      }));

      const res = await importUsersAction(payload, selectedCohort || undefined);
      if (res.success && res.results) {
        setImportResults(res.results as ImportResult[]);
        setStep(3);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Download credentials helper
  const handleDownloadCredentials = () => {
    const createdUsers = importResults.filter(r => r.status === "created" && r.tempPassword);
    if (createdUsers.length === 0) return;

    const headers = ["Email", "Имя", "Временный пароль"];
    const rows = createdUsers.map(u => [u.email, u.name, u.tempPassword || ""]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `credentials-import-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="rounded-lg border-m3-outline-variant bg-m3-surface-container-lowest shadow-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Пакетный импорт пользователей
            </CardTitle>
            <CardDescription>Быстрое зачисление слушателей и создание аккаунтов кураторов</CardDescription>
          </div>
          {step > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              disabled={loading}
              className="rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        
        {/* STEP 1: UPLOAD / PASTE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Left Column: Config */}
              <div className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                    Роли по умолчанию
                    <span title="Будут назначены пользователям, если роль не указана в строке CSV">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                    </span>
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignableRoles.map((role) => (
                      <label 
                        key={role} 
                        className={`flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer text-sm transition-all duration-200 ${
                          defaultRoles.includes(role) 
                            ? "border-primary bg-primary/5 text-primary font-medium" 
                            : "border-m3-outline-variant"
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={defaultRoles.includes(role)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDefaultRoles([...defaultRoles, role]);
                            } else {
                              if (defaultRoles.length > 1) {
                                setDefaultRoles(defaultRoles.filter(r => r !== role));
                              }
                            }
                          }}
                          className="h-4 w-4 rounded border-m3-outline-variant text-primary focus:ring-primary" 
                        />
                        {ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-2">
                  <label htmlFor="cohort" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    Автоматически зачислить в поток
                  </label>
                  <select 
                    id="cohort"
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                    className="w-full rounded-lg border border-m3-outline-variant bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Не зачислять в поток (только создать аккаунты)</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.course ? `(${c.course.title})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Слушатели будут автоматически зачислены в этот поток при импорте. Для других ролей настройка игнорируется.
                  </p>
                </div>
              </div>

              {/* Right Column: File drop or Paste */}
              <div className="space-y-4">
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                  className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    dragActive 
                      ? "border-primary bg-primary/5 scale-[0.99]" 
                      : "border-m3-outline-variant bg-muted/10 hover:bg-muted/20"
                  }`}
                >
                  <Upload className="h-10 w-10 text-muted-foreground/80 mb-3 animate-bounce" />
                  <p className="text-sm font-semibold mb-1">Перетащите сюда файл .csv</p>
                  <p className="text-xs text-muted-foreground mb-4">или нажмите, чтобы выбрать с диска</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,text/csv" 
                    className="hidden" 
                  />
                  <div className="bg-background rounded-full px-3 py-1 border text-[10px] text-muted-foreground font-medium">
                    Кодировка UTF-8
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="csvText" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                      Или вставьте текст вручную
                    </label>
                    <span className="text-[10px] text-muted-foreground">Шаблон: email, Имя Фамилия</span>
                  </div>
                  <textarea 
                    id="csvText"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={`student1@example.com, Иван Иванов\nstudent2@example.com, Анна Сидорова\ncurator1@example.com, Петр Петров, curator`}
                    rows={4}
                    className="w-full rounded-lg border border-m3-outline-variant bg-background p-3 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <Button 
                onClick={() => handleParse(csvText)} 
                disabled={!csvText.trim()}
                className="rounded-lg px-6 py-5 flex items-center gap-2"
              >
                <Play className="h-4 w-4" /> Анализировать данные
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & CONFIRM */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Интерактивный предварительный просмотр</h4>
                <p className="text-xs text-muted-foreground">
                  Будет зачислено {parsedUsers.filter(u => u.selected && u.isValid).length} из {parsedUsers.length} строк.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setParsedUsers(parsedUsers.map(u => ({ ...u, selected: u.isValid })))}
                  className="rounded-lg text-xs"
                >
                  Выбрать все готовые
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setParsedUsers(parsedUsers.map(u => ({ ...u, selected: false })))}
                  className="rounded-lg text-xs"
                >
                  Снять все
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>ФИО / Название</TableHead>
                    <TableHead>Роли</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, idx) => (
                    <TableRow key={idx} className={!user.isValid ? "bg-rose-50/30" : ""}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={user.selected}
                          disabled={!user.isValid}
                          onChange={(e) => {
                            const updated = [...parsedUsers];
                            updated[idx].selected = e.target.checked;
                            setParsedUsers(updated);
                          }}
                          className="h-4 w-4 rounded border-m3-outline-variant text-primary focus:ring-primary disabled:opacity-50"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.email}</TableCell>
                      <TableCell className="text-sm font-medium">{user.name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roleKeys.map((r) => (
                            <span key={r} className="text-[10px] bg-primary/5 text-primary border border-primary/20 rounded-md px-1.5 font-medium">
                              {ROLE_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isValid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <Check className="h-3 w-3" /> Готов
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100" title={user.error}>
                            <AlertCircle className="h-3 w-3" /> Ошибка
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <Button 
                variant="secondary" 
                onClick={() => setStep(1)}
                className="rounded-lg"
              >
                Изменить данные
              </Button>
              <Button 
                onClick={handleImport}
                disabled={loading || parsedUsers.filter(u => u.selected).length === 0}
                className="rounded-lg px-6 py-5 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Импорт...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" /> Запустить импорт ({parsedUsers.filter(u => u.selected).length})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS SUMMARY & DOWNLOAD */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
            <div className="mx-auto max-w-xl space-y-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-6 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-emerald-800">Импорт успешно завершен!</h3>
              <p className="text-sm text-emerald-700">
                Все выбранные записи были успешно обработаны на сервере.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                <div className="bg-background rounded-lg p-3 border">
                  <div className="font-bold text-emerald-600 text-lg">
                    {importResults.filter(r => r.status === "created").length}
                  </div>
                  <div className="text-muted-foreground">Создано</div>
                </div>
                <div className="bg-background rounded-lg p-3 border">
                  <div className="font-bold text-blue-600 text-lg">
                    {importResults.filter(r => r.status === "enrolled").length}
                  </div>
                  <div className="text-muted-foreground">Зачислено</div>
                </div>
                <div className="bg-background rounded-lg p-3 border">
                  <div className="font-bold text-amber-600 text-lg">
                    {importResults.filter(r => r.status === "skipped").length}
                  </div>
                  <div className="text-muted-foreground">Пропущено</div>
                </div>
                <div className="bg-background rounded-lg p-3 border">
                  <div className="font-bold text-rose-600 text-lg">
                    {importResults.filter(r => r.status === "failed").length}
                  </div>
                  <div className="text-muted-foreground">Ошибки</div>
                </div>
              </div>

              {importResults.some(r => r.status === "created" && r.tempPassword) && (
                <div className="pt-4">
                  <Button 
                    onClick={handleDownloadCredentials} 
                    className="w-full rounded-lg py-6 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                  >
                    <Download className="h-5 w-5" /> Скачать CSV-файл с реквизитами доступа
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Внимание! Пароли генерируются на сервере один раз в зашифрованном виде. Обязательно скачайте этот файл для выдачи доступов пользователям.
                  </p>
                </div>
              )}
            </div>

            {/* In-depth list of results */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Подробный лог импорта</h4>
              <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Временный пароль / Ошибка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((res, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{res.email}</TableCell>
                        <TableCell className="text-sm font-medium">{res.name || "—"}</TableCell>
                        <TableCell>
                          {res.status === "created" && (
                            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Создан</span>
                          )}
                          {res.status === "enrolled" && (
                            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Зачислен</span>
                          )}
                          {res.status === "skipped" && (
                            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Пропущен</span>
                          )}
                          {res.status === "failed" && (
                            <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Ошибка</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {res.status === "created" && res.tempPassword && (
                            <span className="bg-muted px-2 py-1 rounded border text-foreground font-semibold">{res.tempPassword}</span>
                          )}
                          {res.status === "failed" && res.error && (
                            <span className="text-rose-600">{res.error}</span>
                          )}
                          {res.status === "skipped" && res.error && (
                            <span className="text-muted-foreground">{res.error}</span>
                          )}
                          {res.status === "enrolled" && (
                            <span className="text-blue-600">Слушатель добавлен в поток</span>
                          )}
                          {(!res.tempPassword && !res.error && res.status !== "enrolled") && "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-center">
              <Button 
                onClick={() => {
                  setCsvText("");
                  setParsedUsers([]);
                  setImportResults([]);
                  setStep(1);
                }}
                className="rounded-lg"
              >
                Выполнить новый импорт
              </Button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
