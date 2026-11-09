export const WEATHER=Object.freeze({sun:{label:'Sol',rain:false,fog:.0025,light:1,wind:0},rain:{label:'Chuva',rain:true,fog:.005,light:.75,wind:.12},storm:{label:'Tempestade',rain:true,fog:.009,light:.45,wind:.6},wind:{label:'Vento',rain:false,fog:.003,light:.9,wind:.35},fog:{label:'Neblina',rain:false,fog:.018,light:.7,wind:.04}});
export function nextWeather(id){const ids=Object.keys(WEATHER),i=ids.indexOf(id);return ids[(i+1)%ids.length];}
export function weatherPreset(id){return WEATHER[id]||WEATHER.sun;}
