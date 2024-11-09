import fs from "node:fs";
import crypto from "node:crypto";
import ProgressBar from "progress";

// 浏览器环境下的 MD5 计算
function calculateMD5Browser(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 1024 * 1024; // 1MB per chunk
    const reader = new FileReader();
    const hash = crypto.createHash("md5");
    let offset = 0;

    // 读取文件并分块处理
    function readNextChunk() {
      const blob = file.slice(offset, offset + chunkSize);
      reader.onload = () => {
        hash.update(new Uint8Array(reader.result as ArrayBuffer));
        offset += chunkSize;

        if (offset < file.size) {
          readNextChunk();
        } else {
          resolve(hash.digest("hex").toUpperCase());
        }

        // 计算进度并调用回调
        if (onProgress) {
          onProgress(offset / file.size); // 进度是已处理的字节数与总字节数的比例
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }

    readNextChunk();
  });
}

// Node.js 环境下的 MD5 计算
function calculateMD5Node(filePath: string, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const start = new Date().getTime();
    const md5sum = crypto.createHash("md5");
    const stream = fs.createReadStream(filePath);

    // 获取文件总大小
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      const totalSize = stats.size;

      // 创建进度条
      const bar = new ProgressBar(":percent [:bar] :current/:total", {
        total: totalSize,
        width: 40,
        complete: "=",
        incomplete: " ",
        renderThrottle: 100,
      });

      stream.on("data", (chunk: Buffer) => {
        md5sum.update(chunk);
        bar.tick(chunk.length); // 更新进度条

        // 调用进度回调
        if (onProgress) {
          onProgress(bar.curr / totalSize); // 当前进度百分比
        }
      });

      stream.on("end", () => {
        const md5 = md5sum.digest("hex").toUpperCase();
        console.log(
          `文件: ${filePath}, MD5签名为: ${md5}. 耗时: ${(new Date().getTime() - start) / 1000.0}秒`
        );
        resolve(md5);
      });

      stream.on("error", reject);
    });
  });
}

// 主函数，支持路径或 File 对象
export function calculateFileMD5(file: File | string, onProgress?: (progress: number) => void): Promise<string> {
  if (typeof file === "string") {
    // 如果是路径，则使用 Node.js 计算 MD5
    return calculateMD5Node(file, onProgress);
  } else {
    // 如果是 File 对象，则在浏览器环境中计算 MD5
    return calculateMD5Browser(file, onProgress);
  }
}
