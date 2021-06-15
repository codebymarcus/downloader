const { promisify } = require("util");
const stream = require("stream");
const path = require("path");
const got = require("got");
const fs = require("fs");
const decompress = require("decompress");

const pipeline = promisify(stream.pipeline);

const extract = async (src, dest, { onExtractProgress = null }) => {
  try {
    console.log("extracting", src, dest);
    const res = await decompress(src, dest, {
      map: (file) => {
        if (typeof onExtractProgress === "function") onExtractProgress(file);

        return file;
      },
    });

    return res;
  } catch (error) {
    throw new Error(error);
  }
};

const extractFileName = (file) => {
  const split = file.split("/");
  const fileName = split[split.length - 1];

  return fileName;
};

const download = async (
  file,
  dest = null,
  opts,
  { onExtractProgress, onDownloadProgress }
) => {
  const destination = dest || extractFileName(file);
  try {
    await pipeline(
      got.stream(file).on("downloadProgress", (res) => {
        if (typeof onDownloadProgress === "function") onDownloadProgress(res);
      }),
      fs.createWriteStream(path.join(__dirname, destination))
    );

    if (typeof opts === "object") {
      if (opts.extract) {
        await extract(destination, opts.extractFilePath, { onExtractProgress });
      }
    }

    const extractedPathArr = destination.split(".");
    const destinationDirName = extractedPathArr[0];

    return {
      path: path.join(__dirname, opts.extractFilePath, destinationDirName),
    };
  } catch (error) {
    throw new Error(error);
  }
};

(async () => {
  const downloadable =
    "https://internal-kubli-files.appshouse.com/browsers/linux-browser-chrome-v888113.zip";

  const d = await download(
    downloadable,
    null,
    {
      extract: true,
      extractFilePath: "./downloads",
    },
    {
      onDownloadProgress: (file) => {
        console.log(file.percent * 100);
      },
      onExtractProgress: (file) => console.log("extracting", file.path),
    }
  );
  console.log("done", d);
})();
