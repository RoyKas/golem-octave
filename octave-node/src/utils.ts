
export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

export function removeEmptyLines(data: string[]) {
  for (let index = 0; index < data.length; index++) {
    if ( data[index].length < 1 ) {                     // remove if empty, this can be improved.
                                                        // e.g. remove lines which are empty or only have spaces, tabs, ...
      data.splice(index, 1);
    }
  }
}

export function logList(text: string, list: string[]) {
  for (let i = 0; i < list.length; i++) {
    console.log(text, list[i]);
  }
}

export function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}
