import { grayFrames, withDuration, type FrameSpec } from './gray-sheet';

export function createTotemSprites(sheet: HTMLImageElement) {
  function variant(dark: boolean) {
    const idle: FrameSpec[] = dark
      ? [
          [32, 506, 67, 133, 32, 130, 180],
          [125, 506, 66, 133, 35, 130, 160],
          [217, 506, 70, 133, 39, 130, 180],
          [317, 506, 66, 133, 35, 130, 160],
        ]
      : [
          [33, 18, 66, 135, 31, 132, 180],
          [125, 20, 66, 133, 35, 130, 160],
          [217, 18, 70, 135, 39, 132, 180],
          [317, 20, 66, 133, 35, 130, 160],
        ];
    const attack: FrameSpec[] = dark
      ? [
          [29, 671, 98, 131, 51, 128, 320],
          [133, 691, 171, 109, 55, 106, 90],
          [317, 702, 157, 98, 41, 95, 120],
        ]
      : [
          [27, 184, 100, 132, 53, 129, 320],
          [133, 206, 173, 108, 55, 105, 90],
          [317, 216, 159, 98, 41, 95, 120],
        ];
    const hurt: FrameSpec[] = dark
      ? [[38, 840, 81, 128, 55, 125, 600]]
      : [[38, 353, 81, 129, 55, 126, 600]];
    return {
      idle: grayFrames(sheet, idle),
      walk: grayFrames(
        sheet,
        idle.map((s) => withDuration(s, 120)),
      ),
      attack: grayFrames(sheet, [...attack, withDuration(idle[0], 210)]),
      hurt: grayFrames(sheet, hurt),
      death: grayFrames(sheet, hurt),
    };
  }
  return { totem: variant(false), totemDark: variant(true) };
}

export function createDemonSprites(sheet: HTMLImageElement) {
  const idle: FrameSpec[] = [
    [19, 25, 138, 154, 64, 154, 150],
    [201, 27, 150, 152, 78, 152, 150],
    [404, 29, 136, 150, 62, 150, 150],
    [21, 205, 136, 152, 58, 152, 150],
  ];
  return {
    idle: grayFrames(sheet, idle),
    walk: grayFrames(sheet, [
      [21, 379, 138, 152, 64, 152, 110],
      [182, 381, 152, 148, 74, 148, 110],
      [351, 377, 136, 152, 62, 152, 110],
      [21, 561, 134, 150, 62, 150, 110],
    ]),
    hurt: grayFrames(sheet, [[182, 569, 176, 142, 104, 142, 180]]),
    sweep: grayFrames(sheet, [
      [8, 735, 164, 180, 80, 180, 230],
      [192, 735, 162, 180, 80, 180, 230],
      [393, 759, 189, 156, 65, 156, 140],
      [16, 949, 186, 134, 70, 134, 140],
      [235, 949, 184, 134, 70, 134, 180],
      withDuration(idle[0], 140),
    ]),
    cleave: grayFrames(sheet, [
      [19, 1107, 148, 182, 69, 182, 300],
      [200, 1105, 146, 184, 69, 184, 300],
      [363, 1107, 218, 184, 95, 182, 140],
      [16, 1322, 172, 130, 70, 130, 120],
      [221, 1322, 162, 130, 70, 130, 230],
      withDuration(idle[0], 150),
    ]),
    death: grayFrames(sheet, [
      [25, 1795, 146, 140, 65, 140, 110],
      [215, 1798, 156, 134, 77, 134, 110],
      [420, 1795, 134, 136, 57, 136, 110],
      [21, 1958, 142, 138, 63, 138, 150],
      [216, 1997, 164, 99, 68, 99, 130],
      [421, 2015, 116, 81, 63, 81, 170],
    ]),
  };
}
