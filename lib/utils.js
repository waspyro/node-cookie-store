export const parseSetCookie = (cookies) => {
  if(!cookies) return []
  if(typeof cookies === 'string') cookies = [cookies]
  return cookies.map(str => {
    const parts = str.split(';').map(part => part.trim().split('='))
    const [name, value] = parts.shift()
    const cookie = {name,value}
    for(const [key, value = true] of parts)
      cookie[key.toLowerCase()] = value
    return cookie
  })
}

export const isExpiredCookie = (cookie) => {
  return cookie.expires && new Date(cookie.expires) < Date.now()
}