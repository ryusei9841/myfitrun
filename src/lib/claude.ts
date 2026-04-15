import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type GoalContext = {
  raceName: string;
  raceDate: Date;
  distanceMeters: number;
  targetTimeSeconds: number;
  notes?: string | null;
};

export type ActivityForEvaluation = {
  type: string;
  name: string;
  startDate: Date;
  distanceMeters: number;
  movingTimeSeconds: number;
  totalElevationGain: number;
  averageSpeed: number; // m/s
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
  averageCadence?: number | null;
  calories?: number | null;
};

export type EvaluationResult = {
  summary: string;
  strengths: string;
  improvements: string;
  nextGoal: string;
  trainingPlan: string;
};

function paceMinPerKm(speedMps: number): string {
  if (!speedMps || speedMps <= 0) return "—";
  const secPerKm = 1000 / speedMps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

function paceFromTimeAndDistance(distanceMeters: number, totalSec: number): string {
  if (distanceMeters <= 0 || totalSec <= 0) return "—";
  const secPerKm = totalSec / (distanceMeters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"/km`;
}

function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildGoalSection(goal: GoalContext | null): string {
  if (!goal) return "# 目標\n(設定なし)";
  const days = Math.max(
    0,
    Math.ceil((goal.raceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return `# 目標
- 大会/目標名: ${goal.raceName}
- 目標日: ${goal.raceDate.toISOString().slice(0, 10)} (あと ${days} 日)
- 距離: ${(goal.distanceMeters / 1000).toFixed(2)} km
- 目標タイム: ${formatHMS(goal.targetTimeSeconds)}
- 目標ペース: ${paceFromTimeAndDistance(goal.distanceMeters, goal.targetTimeSeconds)}
- メモ: ${goal.notes ?? "なし"}`;
}

function buildPrompt(a: ActivityForEvaluation, goal: GoalContext | null): string {
  const km = (a.distanceMeters / 1000).toFixed(2);
  const min = (a.movingTimeSeconds / 60).toFixed(1);
  return `あなたは経験豊富なランニング/ウォーキングコーチです。以下のアクティビティを評価し、ユーザーが次に取り組むべき目標と具体的な練習メニューを提案してください。${
    goal
      ? "ユーザーには明確な目標があります。すべてのアドバイスは目標達成に紐づけてください。"
      : ""
  }

# アクティビティ
- 種別: ${a.type}
- タイトル: ${a.name}
- 日時: ${a.startDate.toISOString()}
- 距離: ${km} km
- 運動時間: ${min} 分
- 平均ペース: ${paceMinPerKm(a.averageSpeed)}
- 獲得標高: ${a.totalElevationGain.toFixed(0)} m
- 平均心拍: ${a.averageHeartrate ?? "—"}
- 最大心拍: ${a.maxHeartrate ?? "—"}
- 平均ケイデンス: ${a.averageCadence ?? "—"}
- 消費カロリー: ${a.calories ?? "—"}

${buildGoalSection(goal)}

# 出力形式
必ず次のJSONだけを出力してください。前後に説明文やコードフェンスは不要です。

{
  "summary": "全体評価を2〜3文で。${goal ? "目標との比較を必ず含める。" : ""}",
  "strengths": "良かった点を箇条書き(改行区切り)",
  "improvements": "改善点を箇条書き(改行区切り)",
  "nextGoal": "${goal ? "目標達成に向けた次のマイルストーンを1〜2文で" : "次の現実的な目標を1〜2文で"}",
  "trainingPlan": "今後1週間の練習メニューを曜日ごとに具体的に${goal ? "(目標ペースを意識した内容にする)" : ""}"
}`;
}

async function callClaudeJson(prompt: string, maxTokens = 1500): Promise<Record<string, unknown>> {
  const c = getClient();
  const msg = await c.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Claude response did not contain JSON: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
}

export async function evaluateActivity(
  a: ActivityForEvaluation,
  goal: GoalContext | null = null
): Promise<EvaluationResult> {
  const parsed = await callClaudeJson(buildPrompt(a, goal));
  return {
    summary: String(parsed.summary ?? ""),
    strengths: String(parsed.strengths ?? ""),
    improvements: String(parsed.improvements ?? ""),
    nextGoal: String(parsed.nextGoal ?? ""),
    trainingPlan: String(parsed.trainingPlan ?? ""),
  };
}

// === Coach Report (weekly summary) ===

export type CoachReportInput = {
  goal: GoalContext | null;
  recentActivities: Array<{
    startDate: Date;
    type: string;
    distanceMeters: number;
    movingTimeSeconds: number;
    averageSpeed: number;
    averageHeartrate?: number | null;
    totalElevationGain: number;
  }>;
};

export type CoachReportResult = {
  overview: string;
  paceAdvice: string;
  trainingFocus: string;
  motivation: string;
};

function buildCoachReportPrompt(input: CoachReportInput): string {
  const lines = input.recentActivities
    .slice(0, 20)
    .map((a, i) => {
      const km = (a.distanceMeters / 1000).toFixed(2);
      const min = (a.movingTimeSeconds / 60).toFixed(0);
      return `${i + 1}. ${a.startDate.toISOString().slice(0, 10)} ${a.type} ${km}km ${min}分 平均${paceMinPerKm(a.averageSpeed)} 心拍${a.averageHeartrate ? Math.round(a.averageHeartrate) : "—"} 標高+${Math.round(a.totalElevationGain)}m`;
    })
    .join("\n");

  return `あなたは経験豊富なランニングコーチです。ユーザーの直近のアクティビティと目標を見て、総合的なコーチングレポートを作成してください。

${buildGoalSection(input.goal)}

# 直近のアクティビティ (新しい順)
${lines || "(まだアクティビティがありません)"}

# 出力形式
必ず次のJSONだけを出力してください。前後に説明文やコードフェンスは不要です。

{
  "overview": "現在のフィットネス状況・トレーニング量・傾向を3〜5文で総括。${input.goal ? "目標達成に対する現状の見立て(順調/要努力/厳しい)を必ず含める。" : ""}",
  "paceAdvice": "${input.goal ? "目標ペースに対する現状ペースの分析と、改善の方針を3〜5文で。" : "現状のペース傾向と改善余地を3〜5文で。"}",
  "trainingFocus": "今後2〜4週間で重点的に取り組むべきトレーニングの種類と頻度を具体的に。改行区切りで箇条書き。",
  "motivation": "ユーザーを励ますパーソナルなコメントを2〜3文で。${input.goal ? "目標達成への期待を込めて。" : ""}"
}`;
}

export async function generateCoachReport(input: CoachReportInput): Promise<CoachReportResult> {
  const parsed = await callClaudeJson(buildCoachReportPrompt(input), 2000);
  return {
    overview: String(parsed.overview ?? ""),
    paceAdvice: String(parsed.paceAdvice ?? ""),
    trainingFocus: String(parsed.trainingFocus ?? ""),
    motivation: String(parsed.motivation ?? ""),
  };
}
