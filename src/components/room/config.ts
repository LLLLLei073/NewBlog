/** Shared by the room's raycast targets and its ordinary HTML navigation. */
export const ROOM_LINKS = [
  {
    id: 'computer',
    object: '电脑',
    label: '算法',
    href: '/categories/algorithm/',
  },
  { id: 'textbook', object: '课本', label: '数学', href: '/categories/math/' },
  { id: 'record', object: '唱片机', label: '音乐', href: '/categories/music/' },
  {
    id: 'controller',
    object: '游戏手柄',
    label: '游戏',
    href: '/categories/game/',
  },
  { id: 'drawer', object: '抽屉', label: '其他', href: '/categories/others/' },
  { id: 'bookshelf', object: '书架', label: '全部文章', href: '/blog/' },
  { id: 'portrait', object: '头像相框', label: '关于我', href: '/about/' },
  { id: 'calendar', object: '挂历', label: '归档', href: '/archives/' },
  { id: 'door', object: '房门', label: '友情链接', href: '/friends/' },
] as const;

export type RoomId = (typeof ROOM_LINKS)[number]['id'] | 'lamp';
export const ROOM_ITEMS = [
  ...ROOM_LINKS,
  { id: 'lamp', object: '台灯', label: '切换明暗', href: null },
] as const;
