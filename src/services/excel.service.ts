import * as ExcelJS from 'exceljs';
import { prisma } from '../db/client';
import * as path from 'path';
import * as fs from 'fs';
import { analyzeAudio, getAudioDuration } from '../utils/audio.util';
import { GENRE_TYPES, LOOP, ONE_SHOT } from '../constant/excel.const';
import { cleanPath } from '../utils/common.util';
import { logger } from '../utils/logger';

export async function importExcel(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const userSheet = workbook.getWorksheet('Sheet1');
  if(!userSheet) return;

  for (let i = 3; i <= 5; i++) {
    const row = userSheet.getRow(i);
    const rawFolderPath = cleanPath(row.getCell('B').value);
    const rawFileName = cleanPath(row.getCell('C').value);
    const key = row.getCell('D').value;
    const bpm = row.getCell('E').value;
    const common = row.getCell('F').value;

    // 프로젝트 루트에서 audio_sample 폴더 기준으로 상대 경로 생성
    // https://d3uzxe4z0iimhg.cloudfront.net/sound-library/Future_Rave/samples/[bgnoise_noise 01]bpm=128,bar=8.ogg
    const projectRoot = path.resolve(__dirname, '../../..'); // src 폴더 기준 한 단계 위
    const audioBasePath = path.join(projectRoot, 'audio_library');
    const fullPath = path.resolve(audioBasePath, rawFolderPath, rawFileName);
    const url = path.join('sound-library', rawFolderPath, rawFileName);

    console.log(`📂 경로 확인: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
      logger.warn(`⚠️ 파일 없음: ${fullPath}`);
      // continue; // 이 파일은 건너뜀
    }

    let duration = 0;
    let peaksData = '';
    try {
      const { duration: dr, peaks } = await analyzeAudio(fullPath);
      duration = dr;
      peaksData = JSON.stringify(peaks);
    } catch (error) {
      console.error(`⚠️ [${rawFileName}] duration 분석 실패`);
      logger.error(`⚠️ [${rawFileName}] duration 분석 실패: ${error}`);
    }

    const audioSample = await prisma.audioSample.create({
      data: {
        title: rawFileName,
        url,
        fileName: rawFileName,
        duration,
        key: key ? String(key) : undefined,
        bpm: Number(bpm),
        peaks: peaksData,
      },
    });

    await prisma.audioSampleSubFilter.create({
      data: {
        audioSampleId: audioSample.id,
        subFilterId: common === 'l' ? LOOP : ONE_SHOT,
      },
    });

    // 장르 ID 목록 수집
    const filterForLogArr = [];
    for (let j = 0; j < GENRE_TYPES.length; j++) {
      const cell = row.getCell(7 + j); // G~Q: 7~18
      if (cell.text.trim() !== '') {
        const genreName = GENRE_TYPES[j];
        const subFilter = await prisma.subFilter.findUnique({
          where: { type: genreName },
        });

        if (subFilter) {
          await prisma.audioSampleSubFilter.create({
            data: {
              audioSampleId: audioSample.id,
              subFilterId: subFilter.id,
            },
          });
          filterForLogArr.push(subFilter.id);
        } else {
          console.warn(`⚠️ [${i}] Genre '${genreName}' not found in DB`);
          logger.warn(`⚠️ [${i}] Genre '${genreName}' not found in DB`);
        }
      }
    }

    console.log(`✅ [${audioSample.id}] 삽입완료 - title: ${audioSample.title}, duration: ${duration}, subFilters: ${filterForLogArr.join(',')}`);
    logger.info(`✅ [${audioSample.id}] 삽입완료 - title: ${audioSample.title}, duration: ${duration}, subFilters: ${filterForLogArr.join(',')}`);
  }

  console.log('✅ 엑셀 데이터 삽입 완료');
}
