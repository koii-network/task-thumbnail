const kweb = require("@_koi/sdk/web");
const ktools = new kweb.Web();
const kohaku = require("@_koi/kohaku");

async function getdata() {
    let data
    data = ktools.getNftState("ZExvTcZv0jVoQQ9bKuo61kk1lChLHlewix4Puridy4A")
    console.log(data)
    return data
}

getdata()
