const puppeteer = require("puppeteer");

const startingUrl = process.argv[2] || "http://localhost:3000/";
const startingHost = require('url').parse(startingUrl).host

function isFile(url) {
  if (url.endsWith(".png")) {
    return true;
  }
  if (url.endsWith(".jpg")) {
    return true;
  }
  if (url.endsWith(".jpeg")) {
    return true;
  }
  if (url.endsWith(".txt")) {
    return true;
  }
  if (url.endsWith(".pdf")) {
    return true;
  }
  return false;
}

(async () => {
  const startDate = new Date().getTime();
  const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3239.108 Safari/537.36";
  const seenUrls = {};
  const urls = [startingUrl];

  const browser = await puppeteer.launch();

  let url;
  while ((url = urls.pop()) != null) {
    console.log(`Visiting url: ${url}`);
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    // Listen to a console message containing error
    page.on("console", msg => {
      if (msg.type() === "error") {
        if (msg.text().includes("net::ERR_CERT_AUTHORITY_INVALID")) {
          return;
        }
        console.log(`PAGE LOG ERROR: [${url}]`, msg.text());
      }
    });
    // We can emulate screen dimension
    await page.setViewport({ width: 1600, height: 1100 });
    // ... and device type
    await page.emulateMedia("screen");

    try {
      // await page.goto(url, { waitUntil: "load" });
      await page.goto(url, { waitUntil: "networkidle2" });

      let fileName = url.replace(/(\.|\/|:|%|#)/g, "_");
      if (fileName.length > 100) {
        fileName = fileName.substring(0, 100);
      }
      await page.screenshot({
        path: `./screenshots/${fileName}.jpeg`,
        fullPage: true
      });

      const anchors = await page
        .evaluate(() =>
          Array.from(document.querySelectorAll("a")).map(elm => elm.href)
        )
        // don't escape the site
        .then(anchors => anchors.filter(a => require('url').parse(a).host === startingHost))
        // don't care about anchors
        .then(anchors => anchors.map(a => a.split("#")[0]))
        // ignore files
        .then(anchors => anchors.filter(a => !isFile(a)))
        // ignore seen urls
        .then(anchors => anchors.filter(a => !seenUrls[a]));

      anchors.forEach(a => {
        urls.push(a);
        seenUrls[a] = 1;
      });
    } catch (err) {
      console.log(`An error occured on url: ${url}: ${err}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(
    `Time elapsed ${Math.round((new Date().getTime() - startDate) / 1000)} s`
  );
})();