import fs from "fs/promises";
import Path from "path";

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

export const cookie2filename = (cookie, ext = '.cookie.json') =>
  cookie.domain.split('.').join('_')+'_'+cookie.name + ext

export const loadFolderContent = (path, extFilter = '.cookie.json', parser = JSON.parse) =>
  fs.readdir(path)
    .then(files => files.filter(f => f.endsWith(extFilter)))
    .then(files => Promise.all(files.map(f => fs.readFile(Path.join(path, f), 'utf8')
      .then(parser))))