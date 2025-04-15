import winston from 'winston';
import path from 'path';
import fs from 'fs';

// logs 디렉토리 없으면 생성
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 오늘 날짜 기준 파일 이름
const logFileName = path.join(logDir, `${new Date().toISOString().slice(0, 10)}.log`);

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()} - ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: logFileName }),
    new winston.transports.Console(), // 콘솔에도 출력
  ],
});
