const POSTCARD_WIDTH = 1200;
const POSTCARD_HEIGHT = 1500;


/*
 * --------------------------------------------------------------------------
 * Text helpers
 * --------------------------------------------------------------------------
 */

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}


function titleCase(value) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  return text
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}


/*
 * --------------------------------------------------------------------------
 * Canvas text
 * --------------------------------------------------------------------------
 */

function drawWrappedText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines
) {
  text = cleanText(text);

  if (!text) {
    return y;
  }

  const words = text.split(/\s+/);
  const lines = [];

  let line = "";

  for (const word of words) {
    const test = line
      ? `${line} ${word}`
      : word;

    if (
      ctx.measureText(test).width > maxWidth &&
      line
    ) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    lines.push(line);
  }

  const visibleLines =
    lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    let last =
      visibleLines[visibleLines.length - 1];

    while (
      ctx.measureText(`${last}…`).width > maxWidth &&
      last.length > 1
    ) {
      last = last.slice(0, -1);
    }

    visibleLines[
      visibleLines.length - 1
    ] = `${last}…`;
  }

  for (const current of visibleLines) {
    ctx.fillText(current, x, y);
    y += lineHeight;
  }

  return y;
}


/*
 * --------------------------------------------------------------------------
 * Board URL
 * --------------------------------------------------------------------------
 */

function postcardUrl(record) {
  if (record && record.link) {
    try {
      return new URL(
        record.link,
        window.location.origin
      ).href;
    } catch (error) {
      console.warn(
        "postcard: invalid record link",
        record.link
      );
    }
  }

  return new URL(
    "/board/",
    window.location.origin
  ).href;
}


/*
 * --------------------------------------------------------------------------
 * Postcard drawing
 * --------------------------------------------------------------------------
 */

function drawPostcard(record) {
  const canvas =
    document.createElement("canvas");

  canvas.width = POSTCARD_WIDTH;
  canvas.height = POSTCARD_HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Browser could not create a 2D canvas context"
    );
  }


  /*
   * Background
   */

  ctx.fillStyle = "#f5f2e9";

  ctx.fillRect(
    0,
    0,
    POSTCARD_WIDTH,
    POSTCARD_HEIGHT
  );


  /*
   * Outer border
   */

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 4;

  ctx.strokeRect(
    34,
    34,
    POSTCARD_WIDTH - 68,
    POSTCARD_HEIGHT - 68
  );


  /*
   * Header
   */

  ctx.fillStyle = "#171717";

  ctx.font =
    "600 30px Arial, Helvetica, sans-serif";

  ctx.fillText(
    "@NiagaraAssembly",
    85,
    105
  );


  /*
   * Header rule
   */

  ctx.beginPath();

  ctx.moveTo(85, 135);
  ctx.lineTo(
    POSTCARD_WIDTH - 85,
    135
  );

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 2;

  ctx.stroke();


  /*
   * Category
   */

  const category =
    titleCase(record.category);

  if (category) {
    ctx.font =
      "500 25px Arial, Helvetica, sans-serif";

    ctx.fillStyle = "#555";

    ctx.fillText(
      category.toUpperCase(),
      85,
      205
    );
  }


  /*
   * Title
   */

  ctx.fillStyle = "#171717";

  ctx.font =
    "700 70px Arial, Helvetica, sans-serif";

  let y = 290;

  y = drawWrappedText(
    ctx,
    record.title || "Board listing",
    85,
    y,
    1030,
    82,
    4
  );

  y += 55;


  /*
   * Location / date / place
   */

  ctx.font =
    "600 28px Arial, Helvetica, sans-serif";

  ctx.fillStyle = "#171717";

  const location =
    cleanText(record.location);

  const when =
    cleanText(record.when);

  const where =
    cleanText(record.where);

  if (location) {
    ctx.fillText(
      location,
      85,
      y
    );

    y += 48;
  }

  if (when) {
    ctx.fillText(
      when,
      85,
      y
    );

    y += 48;
  }

  if (where) {
    ctx.fillText(
      where,
      85,
      y
    );

    y += 48;
  }


  /*
   * Offer
   */

  const offer =
    cleanText(record.offer);

  if (offer) {
    y += 10;

    ctx.font =
      "600 25px Arial, Helvetica, sans-serif";

    ctx.fillStyle = "#555";

    ctx.fillText(
      offer.toUpperCase(),
      85,
      y
    );

    y += 45;
  }


  /*
   * Description
   */

  const description =
    cleanText(record.description);

  if (description) {
    y += 30;

    ctx.font =
      "400 31px Arial, Helvetica, sans-serif";

    ctx.fillStyle = "#171717";

    drawWrappedText(
      ctx,
      description,
      85,
      y,
      1030,
      45,
      8
    );
  }


  /*
   * Link section
   */

  ctx.beginPath();

  ctx.moveTo(85, 1080);
  ctx.lineTo(
    POSTCARD_WIDTH - 85,
    1080
  );

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 2;

  ctx.stroke();


  ctx.fillStyle = "#171717";

  ctx.font =
    "700 34px Arial, Helvetica, sans-serif";

  ctx.fillText(
    "Link:",
    85,
    1155
  );


  /*
   * URL
   */

  ctx.font =
    "400 28px Arial, Helvetica, sans-serif";

  ctx.fillStyle = "#555";

  const url =
    postcardUrl(record);

  drawWrappedText(
    ctx,
    url,
    85,
    1205,
    1030,
    40,
    3
  );


  /*
   * Footer
   */

  ctx.fillStyle = "#171717";

  ctx.font =
    "600 28px Arial, Helvetica, sans-serif";

  ctx.fillText(
    "NIAGARA ASSEMBLY",
    85,
    1390
  );


  ctx.font =
    "400 23px Arial, Helvetica, sans-serif";

  ctx.fillStyle = "#555";

  ctx.fillText(
    "Technology • Industry • Commons",
    85,
    1430
  );


  /*
   * Small assembly mark
   */

  ctx.strokeStyle = "#171717";
  ctx.lineWidth = 3;

  ctx.beginPath();

  ctx.moveTo(1080, 1365);
  ctx.lineTo(1120, 1405);
  ctx.lineTo(1080, 1445);

  ctx.stroke();


  return canvas;
}


/*
 * --------------------------------------------------------------------------
 * JPEG conversion
 * --------------------------------------------------------------------------
 */

function canvasToBlob(canvas) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "Browser could not create JPEG"
              )
            );
          }
        },
        "image/jpeg",
        0.92
      );
    }
  );
}


/*
 * --------------------------------------------------------------------------
 * Filename
 * --------------------------------------------------------------------------
 */

function postcardFilename(record) {
  const title =
    cleanText(record.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

  return (
    `niagara-assembly-${title || "board"}.jpg`
  );
}


/*
 * --------------------------------------------------------------------------
 * Share / download
 * --------------------------------------------------------------------------
 */

async function shareOrDownload(
  blob,
  filename
) {
  const file =
    new File(
      [blob],
      filename,
      {
        type: "image/jpeg"
      }
    );


  /*
   * Prefer the native share sheet when
   * the browser supports file sharing.
   */

  if (
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({
      files: [file]
    })
  ) {
    try {
      await navigator.share({
        title: "Niagara Assembly",
        text: "From the Niagara Assembly Board",
        files: [file]
      });

      return;

    } catch (error) {

      /*
       * User cancelled the share sheet.
       * That is not an error.
       */

      if (
        error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.warn(
        "Native sharing unavailable:",
        error
      );
    }
  }


  /*
   * Fall back to downloading the JPEG.
   */

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}


/*
 * --------------------------------------------------------------------------
 * Create postcard
 * --------------------------------------------------------------------------
 */

async function createPostcard(record) {
  if (!record) {
    throw new Error(
      "Cannot create postcard without a record"
    );
  }

  const canvas =
    drawPostcard(record);

  const blob =
    await canvasToBlob(canvas);

  await shareOrDownload(
    blob,
    postcardFilename(record)
  );
}


/*
 * --------------------------------------------------------------------------
 * Attach button to an exact Board card
 * --------------------------------------------------------------------------
 *
 * board.js calls this with the actual DOM element it just
 * created for the record. There is deliberately no DOM
 * searching, title matching, MutationObserver, or global
 * record lookup here.
 */

export function attachPostcardButtons(
  card,
  record
) {
  if (!card || !record) {
    return;
  }

  /*
   * Prevent duplicate installation.
   */

  if (
    card.querySelector(
      ".board-postcard"
    )
  ) {
    return;
  }


  /*
   * Wrapper
   */

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "board-postcard";


  /*
   * Button
   */

  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "board-postcard__button";

  button.textContent =
    "Create postcard";

  button.setAttribute(
    "aria-label",
    `Create postcard for ${
      record.title || "this listing"
    }`
  );


  /*
   * Action
   */

  button.addEventListener(
    "click",
    async () => {
      button.disabled = true;

      button.textContent =
        "Creating…";

      try {
        await createPostcard(record);

        button.textContent =
          "Postcard";

      } catch (error) {
        console.error(
          "postcard:",
          error
        );

        button.textContent =
          "Postcard failed";

        setTimeout(
          () => {
            button.disabled = false;

            button.textContent =
              "Create postcard";
          },
          1800
        );

        return;
      }

      button.disabled = false;
    }
  );


  wrapper.append(button);

  card.append(wrapper);
}


/*
 * Optional public export.
 *
 * Useful if another page eventually wants to
 * generate a postcard without using the Board.
 */

export {
  createPostcard,
  drawPostcard
};
```
