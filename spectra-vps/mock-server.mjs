import { Server } from 'socket.io';

const io = new Server(5200, { cors: { origin: '*' } });

console.log('🧪 Mock Spectra-Server รันอยู่บนพอร์ต 5200...');

io.on('connection', (socket) => {
  console.log('🔌 มี Client เชื่อมต่อเข้ามา:', socket.id);

  socket.on('logon', (msg) => {
    console.log('🔑 ได้รับ logon:', msg);
    socket.emit('logon_success', 'Mock logon success');

    // ยิงข้อมูลจำลองทุกๆ 3 วินาที
    let money = 3000;
    setInterval(() => {
      money += 500;
      const mockData = {
        roundNumber: 5,
        roundPhase: 'combat',
        spikeState: { planted: false, detonated: false, defused: false },
        attackersWon: false,
        teams: [
          {
            teamName: 'Team A',
            ingameTeamId: 0,
            roundsWon: 2,
            players: [
              {
                name: 'MooDeng',
                tagline: '00700',
                playerId: 'uuid-1',
                isAlive: true,
                initialArmor: 50,
                scoreboardWeaponInternal: 'Vandal',
                currUltPoints: 5,
                maxUltPoints: 7,
                money: money,
              }
            ]
          },
          {
            teamName: 'Team B',
            ingameTeamId: 1,
            roundsWon: 2,
            players: [
              {
                name: 'Besuto',
                tagline: '1506',
                playerId: 'uuid-2',
                isAlive: true,
                initialArmor: 25,
                scoreboardWeaponInternal: 'Phantom',
                currUltPoints: 2,
                maxUltPoints: 7,
                money: money - 1000,
              }
            ]
          }
        ]
      };

      console.log(`📡 ส่งข้อมูลจำลองรอบ 5 (เงิน: ${money})...`);
      socket.emit('match_data', JSON.stringify(mockData));
    }, 3000);
  });
});
