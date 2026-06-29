const hasTouchUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent)
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
export const isMobile = hasTouchUA && isCoarsePointer
