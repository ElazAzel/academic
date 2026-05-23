"use client";

import { useState } from "react";
import { 
  Award, 
  CheckCircle, 
  Search, 
  Trash2, 
  Download, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  Check, 
  X,
  User,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Student {
  id: string;
  name: string | null;
  email: string;
}

interface Course {
  id: string;
  title: string;
}

interface Certificate {
  id: string;
  number: string;
  verificationCode: string;
  verificationUrl: string;
  issuedAt: string;
  revokedAt: string | null;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  forced: boolean;
}

interface CertificatesDashboardProps {
  initialStudents: Student[];
  initialCourses: Course[];
  initialCertificates: Certificate[];
}

export function CertificatesDashboard({
  initialStudents,
  initialCourses,
  initialCertificates
}: CertificatesDashboardProps) {
  const [students] = useState<Student[]>(initialStudents);
  const [courses] = useState<Course[]>(initialCourses);
  const [certificates, setCertificates] = useState<Certificate[]>(initialCertificates);

  // Form State
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [forceBypass, setForceBypass] = useState<boolean>(true); // Default to bypass for easy admin issuing

  // Interactive UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"history" | "issue" | "designer">("history");
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter out any students or courses matching search
  const [studentSearch, setStudentSearch] = useState("");
  const filteredStudents = students.filter(s => 
    s.email.toLowerCase().includes(studentSearch.toLowerCase()) || 
    (s.name && s.name.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  // Filter certificates history
  const filteredCertificates = certificates.filter(c => 
    c.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select course on mount if it's "Мастер-курс"
  useState(() => {
    const masterCourse = courses.find(c => c.title.includes("Мастер-курс") || c.title.includes("мышление"));
    if (masterCourse) {
      setSelectedCourse(masterCourse.id);
    }
  });

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourse) {
      setError("Пожалуйста, выберите слушателя и курс.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/v1/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent,
          courseId: selectedCourse,
          force: forceBypass
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка при выпуске сертификата");
      }

      // Add newly issued certificate to local state
      const studentObj = students.find(s => s.id === selectedStudent);
      const courseObj = courses.find(c => c.id === selectedCourse);

      const newCert: Certificate = {
        id: data.id || Math.random().toString(),
        number: data.number,
        verificationCode: data.verificationCode,
        verificationUrl: data.verificationUrl,
        issuedAt: new Date().toISOString(),
        revokedAt: null,
        studentName: studentObj?.name || studentObj?.email || "Слушатель",
        studentEmail: studentObj?.email || "",
        courseTitle: courseObj?.title || "Курс",
        forced: forceBypass
      };

      setCertificates(prev => [newCert, ...prev]);
      setSuccess(`Сертификат ${data.number} успешно выпущен для ${newCert.studentName}!`);
      
      // Reset form
      setSelectedStudent("");
      setStudentSearch("");
      
      // Switch back to history view
      setTimeout(() => {
        setActiveTab("history");
        setSuccess(null);
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось выпустить сертификат";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Вы уверены, что хотите отозвать этот сертификат? Это действие нельзя отменить.")) {
      return;
    }

    setRevokingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/v1/certificates/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Не удалось отозвать сертификат");
      }

      // Update certificate status locally
      setCertificates(prev => prev.map(c => 
        c.id === id ? { ...c, revokedAt: new Date().toISOString() } : c
      ));

      setSuccess("Сертификат успешно отозван.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось отозвать сертификат";
      setError(message);
    } finally {
      setRevokingId(null);
    }
  };

  const activeCerts = certificates.filter(c => !c.revokedAt).length;
  const revokedCerts = certificates.filter(c => c.revokedAt).length;

  return (
    <div className="space-y-6 mt-6">
      
      {/* Metrics Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Всего выданных</p>
              <p className="text-3xl font-bold tracking-tight text-m3-on-surface">{certificates.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Активных</p>
              <p className="text-3xl font-bold tracking-tight text-emerald-600">{activeCerts}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Отозванных</p>
              <p className="text-3xl font-bold tracking-tight text-red-600">{revokedCerts}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Selection */}
      <div className="flex gap-2 border-b border-m3-outline-variant pb-2">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "history" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          История выпусков
        </button>
        <button
          onClick={() => setActiveTab("issue")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "issue" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Выдать сертификат
        </button>
        <button
          onClick={() => setActiveTab("designer")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === "designer" 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Конструктор шаблонов
        </button>
      </div>

      {/* Status Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tab 1: History of Issued Certificates */}
      {activeTab === "history" && (
        <Card className="rounded-2xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Журнал свидетельств</CardTitle>
              <CardDescription>Список всех цифровых сертификатов, зарегистрированных в системе</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру, имени или курсу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-m3-outline"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Слушатель</TableHead>
                    <TableHead>Курс</TableHead>
                    <TableHead>Дата выпуска</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates.length > 0 ? (
                    filteredCertificates.map((cert) => (
                      <TableRow key={cert.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Award className={`h-4 w-4 ${cert.revokedAt ? "text-muted-foreground" : "text-amber-500"}`} />
                            <span className={cert.revokedAt ? "line-through text-muted-foreground" : ""}>
                              {cert.number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{cert.studentName}</p>
                            <p className="text-xs text-muted-foreground">{cert.studentEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{cert.courseTitle}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(cert.issuedAt).toLocaleDateString("ru-RU", {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </TableCell>
                        <TableCell>
                          {cert.revokedAt ? (
                            <Badge variant="destructive" className="text-[10px]">Отозван</Badge>
                          ) : cert.forced ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Вручную
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              Авто
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!cert.revokedAt && (
                              <>
                                <Button size="sm" variant="secondary" asChild title="Скачать PDF">
                                  <Link href={`/api/v1/certificates/${cert.id}/pdf`} target="_blank">
                                    <Download className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                <Button size="sm" variant="secondary" asChild title="Верификация QR">
                                  <Link href={`/certificates/verify/${cert.verificationCode}`} target="_blank">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  onClick={() => handleRevoke(cert.id)} 
                                  disabled={revokingId === cert.id}
                                  title="Отозвать сертификат"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  {revokingId === cert.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Сертификаты не найдены.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Issue Certificate Form */}
      {activeTab === "issue" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Form */}
          <Card className="md:col-span-2 rounded-2xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <CardHeader>
              <CardTitle className="text-lg">Ручной выпуск свидетельства</CardTitle>
              <CardDescription>
                Выпуск цифрового сертификата с фиксацией в базе данных, генерацией серийного номера и проверочного QR-кода.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIssueCertificate} className="space-y-5">
                
                {/* Step 1: Select Student */}
                <div className="space-y-2">
                  <Label htmlFor="student-search">1. Выберите слушателя (ФИО или Email)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="student-search"
                      placeholder="Введите имя или email для быстрого поиска..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 bg-muted/10"
                    />
                  </div>
                  
                  {studentSearch && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-inner divide-y text-xs mt-1">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s.id);
                              setStudentSearch(s.name || s.email);
                            }}
                            className={`p-2 cursor-pointer hover:bg-muted/50 flex justify-between items-center ${
                              selectedStudent === s.id ? "bg-primary/10 font-semibold text-primary" : ""
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm">{s.name || "Без имени"}</p>
                              <p className="text-muted-foreground text-xs">{s.email}</p>
                            </div>
                            {selectedStudent === s.id && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-muted-foreground text-center">Никого не найдено</div>
                      )}
                    </div>
                  )}

                  {selectedStudent && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-m3-on-surface">
                            {students.find(s => s.id === selectedStudent)?.name || "Без имени"}
                          </p>
                          <p className="text-muted-foreground">
                            {students.find(s => s.id === selectedStudent)?.email}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setSelectedStudent("");
                          setStudentSearch("");
                        }}
                        className="h-7 w-7 p-0 rounded-full hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Step 2: Select Course */}
                <div className="space-y-2">
                  <Label htmlFor="course-select">2. Выберите учебную программу (курс)</Label>
                  <select
                    id="course-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full h-10 rounded-lg border border-m3-outline bg-muted/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">-- Выберите курс из списка --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {selectedCourse && courses.find(c => c.id === selectedCourse)?.title.includes("Мастер-курс") && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Выбран мастер-курс: будет использован премиальный шаблон цифрового диплома.
                    </div>
                  )}
                </div>

                {/* Step 3: Force Bypass Checkbox */}
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Bypass progress requirements</Label>
                    <p className="text-xs text-muted-foreground">
                      Выдать в обход проверок успеваемости, автоматически зачислив и завершив курс
                    </p>
                  </div>
                  <Switch
                    checked={forceBypass}
                    onCheckedChange={setForceBypass}
                  />
                </div>

                {/* Submit button */}
                <Button 
                  type="submit" 
                  disabled={loading || !selectedStudent || !selectedCourse} 
                  className="w-full h-11"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Формирование шаблона и запись в БД...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      Выдать сертификат и записать в базу
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Guidelines Sidebar */}
          <div className="space-y-4">
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Условия автогенерации
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>
                  Каждое свидетельство генерируется на основе встроенного шаблона, в который динамически подставляются:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>ФИО получателя</strong> — из профиля слушателя</li>
                  <li><strong>Серийный номер</strong> — по стандарту ASA-YYYY-XXXX</li>
                  <li><strong>QR-код проверки</strong> — ведет на публичный портал верификации</li>
                  <li><strong>Подписи руководства</strong> и печать Академии</li>
                </ul>
                <p className="pt-2 border-t text-amber-700">
                  ⚠️ Выпуск сертификата фиксируется в системном логе аудита и отправляет автоматическое in-app уведомление слушателю.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {activeTab === "designer" && (
        <Card className="rounded-2xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
          <CardHeader>
            <CardTitle className="text-lg">Управление шаблонами курсов</CardTitle>
            <CardDescription>Выберите учебную программу для настройки визуального оформления цифровых дипломов.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y border rounded-xl overflow-hidden bg-white">
              {courses.length > 0 ? (
                courses.map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-semibold text-m3-on-surface">{c.title}</p>
                      <p className="text-xs text-muted-foreground">ID: {c.id}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/admin/certificates/designer/${c.id}`}>Редактировать дизайн</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">Нет доступных курсов для настройки.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
