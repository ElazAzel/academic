"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Flame, 
  AlertTriangle, 
  Search, 
  MessageSquare, 
  Send, 
  Activity, 
  CheckCircle,
  Mail
} from "lucide-react";
import { toast } from "sonner";

interface StudentOperation {
  studentId: string;
  name: string;
  email: string;
  courseTitle: string;
  progressPercent: number;
  daysSinceLogin: number | null;
  activeRisks: number;
  highestRiskSeverity: string | null;
  unreadMessages: number;
}

interface CuratorRadarProps {
  students: StudentOperation[];
}

export function CuratorRadar({ students }: CuratorRadarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "leaders" | "active" | "lagging">("all");
  
  // Encouragement modal template state
  const [selectedStudent, setSelectedStudent] = useState<StudentOperation | null>(null);
  const [messageTemplate, setMessageTemplate] = useState<"encouragement" | "praise" | "warning">("encouragement");
  const [customText, setCustomText] = useState("");

  const getStudentCategory = (s: StudentOperation): "leaders" | "active" | "lagging" => {
    if (s.activeRisks > 0 || (s.daysSinceLogin !== null && s.daysSinceLogin >= 5) || s.progressPercent < 20) {
      return "lagging";
    }
    if (s.progressPercent >= 70) {
      return "leaders";
    }
    return "active";
  };

  // Categorize students
  const categorized = students.map(s => ({
    ...s,
    category: getStudentCategory(s)
  }));

  const countMap = {
    all: students.length,
    leaders: categorized.filter(s => s.category === "leaders").length,
    active: categorized.filter(s => s.category === "active").length,
    lagging: categorized.filter(s => s.category === "lagging").length
  };

  const filterCards: Array<{
    key: "all" | "leaders" | "active" | "lagging";
    label: string;
    count: number;
    icon: React.ReactNode;
    tone: string;
  }> = [
    { key: "all", label: "Все слушатели", count: countMap.all, icon: <Users className="h-5 w-5" />, tone: "bg-primary/5 text-primary border-primary/20" },
    { key: "leaders", label: "Лидеры (>=70%)", count: countMap.leaders, icon: <Flame className="h-5 w-5" />, tone: "bg-amber-50 text-amber-600 border-amber-200" },
    { key: "active", label: "В темпе (активные)", count: countMap.active, icon: <CheckCircle className="h-5 w-5" />, tone: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    { key: "lagging", label: "В зоне риска", count: countMap.lagging, icon: <AlertTriangle className="h-5 w-5" />, tone: "bg-red-50 text-red-600 border-red-200" },
  ];

  // Filter students based on category and search query
  const filteredStudents = categorized.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === "all" || s.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getTemplateText = (studentName: string, courseTitle: string) => {
    const name = studentName.split(" ")[0] || "Слушатель";
    if (messageTemplate === "praise") {
      return `Привет, ${name}! Вижу твои отличные успехи на курсе "${courseTitle}"! Ты уже набрал ${Math.round(students.find(s => s.name === studentName)?.progressPercent ?? 0)}% прогресса. Отличный темп, продолжай в том же духе! 🚀`;
    }
    if (messageTemplate === "warning") {
      return `Здравствуйте, ${name}. Обратил внимание, что у нас подходят сроки выполнения модулей на курсе "${courseTitle}". Давайте сверимся, всё ли в порядке и не нужна ли помощь с заданиями? Всегда на связи! ⚠️`;
    }
    return `Привет, ${name}! Давно не виделись на платформе. Надеюсь, всё хорошо. Напоминаю, что мы проходим курс "${courseTitle}". Если возникли сложности с теорией или практикой — напиши мне, я с радостью помогу разобраться! 😊`;
  };

  const handleOpenEncourage = (student: StudentOperation) => {
    setSelectedStudent(student);
    setCustomText(getTemplateText(student.name, student.courseTitle));
  };

  const changeTemplate = (studentName: string, courseTitle: string, type: "encouragement" | "praise" | "warning") => {
    setMessageTemplate(type);
    // Directly set text using standard template generators
    const name = studentName.split(" ")[0] || "Слушатель";
    if (type === "praise") {
      setCustomText(`Привет, ${name}! Вижу твои отличные успехи на курсе "${courseTitle}"! Ты уже набрал ${Math.round(selectedStudent?.progressPercent ?? 0)}% прогресса. Отличный темп, продолжай в том же духе! 🚀`);
    } else if (type === "warning") {
      setCustomText(`Здравствуйте, ${name}. Обратил внимание, что у нас подходят сроки выполнения модулей на курсе "${courseTitle}". Давайте сверимся, всё ли в порядке и не нужна ли помощь с заданиями? Всегда на связи! ⚠️`);
    } else {
      setCustomText(`Привет, ${name}! Давно не виделись на платформе. Надеюсь, всё хорошо. Напоминаю, что мы проходим курс "${courseTitle}". Если возникли сложности с теорией или практикой — напиши мне, я с радостью помогу разобраться! 😊`);
    }
  };

  const handleSendEncouragement = () => {
    toast.success(`Сообщение поддержки отправлено для ${selectedStudent?.name}!`);
    setSelectedStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Activity Pulse Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {filterCards.map((c) => (
          <Card 
            key={c.key} 
            onClick={() => setActiveFilter(c.key)}
            className={`border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
              activeFilter === c.key 
                ? `${c.tone.split(" ")[0]} ring-2 ring-primary/30 font-semibold` 
                : "bg-white"
            }`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.count}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.tone}`}>
                {c.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Radar Card */}
      <Card className="rounded-2xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              <span>Радар активности слушателей</span>
            </CardTitle>
            <CardDescription>
              Своевременно реагируйте на отстающих и поддерживайте высокую мотивацию лидеров.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Быстрый поиск по ФИО или курсу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/20 border-m3-outline"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(s => (
                <div key={s.studentId} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-m3-on-surface">{s.name}</p>
                      {s.category === "lagging" && (
                        <Badge variant="destructive" className="text-[9px] bg-red-50 text-red-700 border-red-200">В зоне риска</Badge>
                      )}
                      {s.category === "leaders" && (
                        <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">Лидер 🚀</Badge>
                      )}
                      {s.category === "active" && (
                        <Badge variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">Активен ✓</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                      {s.courseTitle}
                    </p>
                  </div>
                  
                  {/* Progress & Login details */}
                  <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                    <div className="space-y-1 min-w-[100px]">
                      <div className="flex justify-between text-[10px]">
                        <span>Учебный прогресс</span>
                        <span className="font-semibold text-slate-800">{s.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-24 rounded-full overflow-hidden bg-slate-100">
                        <div 
                          className={`h-full rounded-full ${
                            s.progressPercent >= 70 ? "bg-amber-500" : s.progressPercent >= 20 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${s.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Последний вход</p>
                      <p className="font-medium text-slate-700 mt-0.5">
                        {s.daysSinceLogin === null 
                          ? "Никогда" 
                          : s.daysSinceLogin === 0 
                            ? "Сегодня" 
                            : `${s.daysSinceLogin} дн. назад`}
                      </p>
                    </div>
                  </div>

                  {/* Operational actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleOpenEncourage(s)}
                      title="Отправить мотивирующее сообщение"
                      className="text-primary hover:bg-primary/5 border-primary/20"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Поддержать
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Слушатели не найдены.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Encouragement templates modal dialog */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg rounded-2xl shadow-xl border animate-in zoom-in-95 duration-200 bg-white">
            <CardHeader className="border-b bg-slate-50 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>Поддержка слушателя</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Отправка мотивирующего сообщения для {selectedStudent.name}
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedStudent(null)} 
                  className="h-8 w-8 p-0 rounded-full hover:bg-slate-200"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">1. Выберите шаблон сообщения:</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { type: "encouragement" as const, label: "Напомнить о себе" },
                    { type: "praise" as const, label: "Похвалить за успехи" },
                    { type: "warning" as const, label: "Сроки и дедлайны" }
                  ].map(t => (
                    <Button
                      key={t.type}
                      size="sm"
                      variant={messageTemplate === t.type ? "primary" : "secondary"}
                      onClick={() => changeTemplate(selectedStudent.name, selectedStudent.courseTitle, t.type)}
                      className="text-xs truncate"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">2. Текст сообщения куратора:</label>
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full min-h-[120px] p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mt-1.5 resize-none bg-slate-50"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="secondary" onClick={() => setSelectedStudent(null)} size="sm">
                  Отмена
                </Button>
                <Button onClick={handleSendEncouragement} size="sm" className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Отправить сообщение
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
