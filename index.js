const nodecastor = require("nodecastor");
const mdns = require("mdns-js");
const debug = require("./debug");

const YOUTUBE_APP_ID = "233637DE";

const browser = mdns.createBrowser(
  new mdns.ServiceType({ name: "googlecast", protocol: "tcp" })
);

browser.on("ready", function () {
  browser.discover();
});

browser.on("update", function (service) {
  if (
    service.type.length > 0 &&
    service.type[0].name === "googlecast" &&
    service.txt
  ) {
    const txtRecord = {};

    service.txt.forEach((txt) => {
      const [key, value] = txt.split("=");
      txtRecord[key] = value;
    });

    const hasVideo = hasVideoCapability(txtRecord.ca);

    if (hasVideo) {
      console.log("Chromecast Found:", txtRecord.fn);

      browser.stop();

      const device = new nodecastor.CastDevice({
        friendlyName: txtRecord.fn,
        address: service.addresses[0],
        port: service.port,
      });

      device.on("connect", () => {
        device.on("status", handleStatusChange(device));
        device.status(handleStatusChange(device));
      });
    }
  }
});

function handleStatusChange(device) {
  return function (statusOrError, receivedStatus) {
    if (statusOrError instanceof Error) {
      console.log("Error getting status:", statusOrError);
      return;
    }

    let status = statusOrError;

    if (!status && receivedStatus) {
      status = receivedStatus;
    }

    if (status.applications && status.applications.length > 0) {
      const app = status.applications[0];

      if (app.appId == YOUTUBE_APP_ID) {
        console.log("YouTube app is running on the Chromecast");

        device.application(YOUTUBE_APP_ID, (err, app) => {
          if (err) {
            console.log("Error getting application:", err);
            return;
          }

          app.join("urn:x-cast:com.google.cast.media", (err, session) => {
            if (err) {
              console.log("Error joining session:", err);
              return;
            }

            // Listen for state changes
            session.on("message", (message) => {
              const currentTime = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false, // Use 24-hour format
              });
              console.log("Current Time:", currentTime);
              debug("Message", message);

              if (
                message.type === "MEDIA_STATUS" &&
                message.status &&
                message.status[0]
              ) {
                const status = message.status[0];
                if (
                  status.playerState === "IDLE" &&
                  status.idleReason === "FINISHED"
                ) {
                  console.log("Got IDLE status with FINISHED reason !!!");

                  session.send({ type: "QUEUE_UPDATE", jump: 1 }, (err) => {
                    if (err) {
                      console.log("Error sending QUEUE_UPDATE command:", err);
                    }
                  });
                }
              }
            });

            session.send({ type: "GET_STATUS" });
          });
        });
      }
    }
  };
}

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
