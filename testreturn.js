function getValues() {
    const cid = "123"
    const thumbnail = "456"
    return [cid, thumbnail];
}


var values = getValues();
var cid = values[0];
var thumbnail = values[1];

console.log(cid, thumbnail);