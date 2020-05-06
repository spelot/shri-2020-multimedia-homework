const os = require("os");
const ifaces = os.networkInterfaces();

let localIp = "localhost";

Object.keys(ifaces).forEach(function (ifname) {
  let alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ("IPv4" !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias === 0) {
      // save only first ipv4 adress of this interface
      localIp = iface.address;
    }

    ++alias;
  });
});

const replace = require("replace-in-file");
const options = {
  files: "dist/*.js",
  from: /localhost/g,
  to: `${localIp}`,
};
replace(options)
  .then((results) => {
    console.log("Replacement results:", results, "\n\n");
    console.log(
      "\x1b[36m%s\x1b[0m",
      "link for remote debugging on phone in the same local network:",
      `http://${localIp}:\x1b[32m3102\x1b[0m/dist/`
    );
  })
  .catch((error) => {
    console.error("Error occurred:", error);
  });
