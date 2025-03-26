const nodecastor = require("nodecastor");
const mdns = require("mdns");

const browser = mdns.createBrowser(mdns.tcp("googlecast"));

browser.on("serviceUp", (service) => {
  const hasVideo = hasVideoCapability(service.txtRecord.ca);

  if (hasVideo) {
    console.log("Chromecast Found:", service.txtRecord.fn);

    const device = new nodecastor.CastDevice({
      friendlyName: service.txtRecord.fn,
      address: service.addresses[0],
      port: service.port,
    });

    device.on("connect", () => {
      device.application("233637DE", (err, app) => {
        if (err) {
          console.log(err);
          return;
        }

        app.join("urn:x-cast:com.google.cast.media", (err, service) => {
          if (err) {
            console.log(err);
            return;
          }

          // Listen for state changes
          service.on("message", (message) => {
            const currentTime = new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false, // Use 24-hour format
            });
            console.log("Current Time:", currentTime);
            console.dir(message, { depth: 10 });
          });

          service.send({ type: "GET_STATUS" }, (err) => {
            if (err) {
              console.log("Error sending GET_STATUS command:", err);
            }
          });

          // service.send({ type: "QUEUE_UPDATE", jump: 1 }, (err) => {
          //   if (err) {
          //     console.log("Error sending GET_STATUS command:", err);
          //   }
          // });
        });
      });
    });
  }

  browser.stop();
});

browser.start();

function hasVideoCapability(caString) {
  const CapabilityFlags = {
    VideoOut: 1 << 0,
    VideoIn: 1 << 1,
    AudioOut: 1 << 2,
    AudioIn: 1 << 3,
    DevMode: 1 << 4,
  };

  const caNumber = parseInt(caString, 10);

  // keep only the lowest 5 bits
  // 31 in binary is 00011111
  const value = caNumber & 31;

  return (value & CapabilityFlags.VideoOut) !== 0;
}
