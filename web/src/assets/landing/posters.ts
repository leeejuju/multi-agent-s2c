import posterArchive01 from "./julia-portal-abyss.webp";
import posterArchive02 from "./poster-archive-02.svg";
import posterArchive03 from "./poster-archive-03.svg";
import posterArchive04 from "./poster-archive-04.svg";

export type LandingPosterDecoration = {
  className: string;
  delay: string;
  rotation: string;
  scatterFrom: {
    x: number;
    y: number;
    scale: number;
  };
  src: string;
};

export type LandingShapeDecoration = {
  className: string;
  delay: string;
};

export const landingPosterDecorations: LandingPosterDecoration[] = [
  {
    className:
      "left-[0.5rem] top-[18vh] h-[25rem] w-[17rem] max-[1180px]:h-[22rem] max-[1180px]:w-[15rem] max-[760px]:left-[-4rem] max-[760px]:top-[12vh] max-[760px]:h-[17rem] max-[760px]:w-[11.4rem]",
    delay: "80ms",
    rotation: "0deg",
    scatterFrom: { x: 132, y: 12, scale: 0.79 },
    src: posterArchive01,
  },
  {
    className:
      "right-[0.8rem] top-[17vh] h-[23.5rem] w-[15.6rem] max-[1180px]:h-[20rem] max-[1180px]:w-[13.6rem] max-[900px]:right-[-3.8rem] max-[760px]:hidden",
    delay: "160ms",
    rotation: "0deg",
    scatterFrom: { x: -124, y: 14, scale: 0.78 },
    src: posterArchive02,
  },
  {
    className:
      "bottom-[-3.2rem] left-[11vw] h-[22.2rem] w-[14.9rem] max-[1180px]:left-[7vw] max-[1180px]:h-[19rem] max-[1180px]:w-[12.3rem] max-[760px]:bottom-[-6.2rem] max-[760px]:left-[-0.8rem] max-[760px]:h-[15.5rem] max-[760px]:w-[10.3rem]",
    delay: "240ms",
    rotation: "0deg",
    scatterFrom: { x: 62, y: -108, scale: 0.8 },
    src: posterArchive03,
  },
  {
    className:
      "bottom-[-3rem] right-[7vw] h-[20.2rem] w-[13.3rem] max-[1180px]:right-[4vw] max-[1180px]:h-[17.8rem] max-[1180px]:w-[11.7rem] max-[900px]:hidden",
    delay: "320ms",
    rotation: "0deg",
    scatterFrom: { x: -78, y: -102, scale: 0.79 },
    src: posterArchive04,
  },
];

export const landingShapeDecorations: LandingShapeDecoration[] = [
  {
    className:
      "left-[11vw] top-[10vh] h-24 w-44 bg-landing-block-cool max-[760px]:left-[58vw] max-[760px]:top-[14vh] max-[760px]:h-14 max-[760px]:w-24",
    delay: "40ms",
  },
  {
    className:
      "right-[16vw] top-[31vh] h-28 w-36 bg-landing-block-warm max-[900px]:right-[5vw] max-[760px]:hidden",
    delay: "120ms",
  },
  {
    className:
      "left-[7vw] bottom-[17vh] h-20 w-52 bg-landing-paper max-[900px]:bottom-[10vh] max-[760px]:hidden",
    delay: "200ms",
  },
  {
    className:
      "right-[7vw] bottom-[18vh] h-24 w-44 bg-landing-block-cool max-[900px]:right-[-2rem] max-[760px]:bottom-[12vh] max-[760px]:h-14 max-[760px]:w-28",
    delay: "280ms",
  },
];
