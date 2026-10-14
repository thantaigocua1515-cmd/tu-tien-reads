export const realms = [
  { key: 'luyen_khi', name: 'Luyện Khí', xpThreshold: 0, description: 'Bước đầu tu tiên.' },
  { key: 'truc_co', name: 'Trúc Cơ', xpThreshold: 3600, description: 'Khởi phát sức mạnh thần linh.' },
  { key: 'kim_dan', name: 'Kim Đan', xpThreshold: 36000, description: 'Kim Đan thành hình.' },
  { key: 'nguyen_anh', name: 'Nguyên Anh', xpThreshold: 180000, description: 'Nguyên Anh vững vàng.' },
  { key: 'hoa_than', name: 'Hóa Thần', xpThreshold: 864000, description: 'Đạt đến cảnh giới thần thánh.' },
];

export function getRealmFromXp(xp) {
  let highest = realms[0];
  realms.forEach((realm) => {
    if ((xp || 0) >= realm.xpThreshold) highest = realm;
  });
  return highest;
}

export function formatSeconds(seconds) {
  const total = Number(seconds) || 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}
