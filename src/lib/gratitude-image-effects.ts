export type GratitudeImageFilter = "none" | "warm" | "soft" | "mono" | "forest" | "golden" | "calm";

type Rgb = [number, number, number];

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function sepia([red, green, blue]: Rgb, amount: number): Rgb {
  const sepiaRed = red * 0.393 + green * 0.769 + blue * 0.189;
  const sepiaGreen = red * 0.349 + green * 0.686 + blue * 0.168;
  const sepiaBlue = red * 0.272 + green * 0.534 + blue * 0.131;
  return [
    red + (sepiaRed - red) * amount,
    green + (sepiaGreen - green) * amount,
    blue + (sepiaBlue - blue) * amount,
  ];
}

function saturate([red, green, blue]: Rgb, amount: number): Rgb {
  const luminance = red * 0.213 + green * 0.715 + blue * 0.072;
  return [
    luminance + (red - luminance) * amount,
    luminance + (green - luminance) * amount,
    luminance + (blue - luminance) * amount,
  ];
}

function contrast([red, green, blue]: Rgb, amount: number): Rgb {
  return [(red - 128) * amount + 128, (green - 128) * amount + 128, (blue - 128) * amount + 128];
}

function brightness([red, green, blue]: Rgb, amount: number): Rgb {
  return [red * amount, green * amount, blue * amount];
}

function hueRotate([red, green, blue]: Rgb, degrees: number): Rgb {
  const angle = degrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    red * (0.213 + cosine * 0.787 - sine * 0.213) + green * (0.715 - cosine * 0.715 - sine * 0.715) + blue * (0.072 - cosine * 0.072 + sine * 0.928),
    red * (0.213 - cosine * 0.213 + sine * 0.143) + green * (0.715 + cosine * 0.285 + sine * 0.14) + blue * (0.072 - cosine * 0.072 - sine * 0.283),
    red * (0.213 - cosine * 0.213 - sine * 0.787) + green * (0.715 - cosine * 0.715 + sine * 0.715) + blue * (0.072 + cosine * 0.928 + sine * 0.072),
  ];
}

function filterPixel(rgb: Rgb, filter: GratitudeImageFilter): Rgb {
  switch (filter) {
    case "warm":
      return contrast(saturate(sepia(rgb, 0.2), 1.08), 1.03);
    case "soft":
      return saturate(contrast(brightness(rgb, 1.06), 0.94), 0.92);
    case "mono":
      return contrast(saturate(rgb, 0), 1.08);
    case "forest":
      return contrast(saturate(hueRotate(sepia(rgb, 0.12), 50), 1.12), 1.02);
    case "golden":
      return contrast(brightness(saturate(sepia(rgb, 0.3), 1.18), 1.04), 1.02);
    case "calm":
      return brightness(saturate(contrast(rgb, 1.07), 0.86), 0.98);
    case "none":
      return rgb;
  }
}

/**
 * Applies the gratitude effect directly to image pixels. Canvas `filter` is ignored
 * by some iOS WebViews, so postcard export must not depend on that optional API.
 */
export function applyGratitudeImageEffect(data: Uint8ClampedArray, filter: GratitudeImageFilter) {
  if (filter === "none") return data;

  for (let index = 0; index < data.length; index += 4) {
    const [red, green, blue] = filterPixel([data[index], data[index + 1], data[index + 2]], filter);
    data[index] = clampChannel(red);
    data[index + 1] = clampChannel(green);
    data[index + 2] = clampChannel(blue);
  }
  return data;
}
