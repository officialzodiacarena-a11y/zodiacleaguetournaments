const fs = require('fs');
let content = fs.readFileSync('components/tournament-bracket-view.tsx', 'utf8');

const oldBtn = `<button className="w-full rounded-lg border border-[#E8B429] bg-transparent py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/10 transition-all mt-4">
              ดูสถิติเต็ม / VIEW FULL STATS
            </button>`;

const newBtn = `<Link href={\`/matches/\${selectedMatch.id}/lobby\`} className="block text-center w-full rounded-lg bg-gradient-to-r from-[#E8B429] to-[#f5d478] py-2.5 text-xs font-black tracking-wider text-[#0D0E1A] hover:opacity-90 transition-all mt-4 mb-2">
              เข้าห้องแข่ง / ENTER LOBBY
            </Link>
            <button className="w-full rounded-lg border border-[#E8B429] bg-transparent py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/10 transition-all">
              ดูสถิติเต็ม / VIEW FULL STATS
            </button>`;

if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
  if (!content.includes("import Link from 'next/link';")) {
    content = "import Link from 'next/link';\n" + content;
  }
  fs.writeFileSync('components/tournament-bracket-view.tsx', content, 'utf8');
}
