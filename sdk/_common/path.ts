import fs from "node:fs";
import path from "node:path";

export function isDirectoryEmpty(
  directoryPath: string,
  ignoreNames: string[] = [],
  callback: (err: Error | null, isEmpty?: boolean) => void
) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return callback(err); // 读取文件夹出错时
    }

    // 过滤掉需要忽略的文件（文件夹）名
    const filteredFiles = files.filter((file) => !ignoreNames.includes(file));

    // 如果过滤后文件夹为空，则返回 true
    callback(null, filteredFiles.length === 0);
  });
}

export function isDirectoryEmptySync(
  directoryPath: string,
  ignoreNames: string[] = []
) {
  try {
    const files = fs.readdirSync(directoryPath);

    // 过滤掉需要忽略的文件（文件夹）名
    const filteredFiles = files.filter((file) => !ignoreNames.includes(file));

    // 如果过滤后文件夹为空，则返回 true
    return filteredFiles.length === 0;
  } catch (err) {
    console.error("读取文件夹错误:", err);
    return false;
  }
}

/**
 * 将目录中的内容提升到父级目录
 * @param directoryPath 目录路径
 */
export function moveContentsUp(directoryPath: string): void {
  // 获取目录内容
  const files = fs.readdirSync(directoryPath);

  if (files.length === 0) {
    console.log('目录为空，无法处理');
    return;
  }

  // 获取最外层文件夹路径
  const outerFolder = path.join(directoryPath, files[0]);

  // 检查是否是文件夹
  if (fs.statSync(outerFolder).isDirectory()) {
    // 获取文件夹中的所有内容
    const innerFiles = fs.readdirSync(outerFolder);

    // 将所有文件和文件夹从最外层文件夹移动到父级目录
    innerFiles.forEach((item) => {
      const oldPath = path.join(outerFolder, item);
      const newPath = path.join(directoryPath, item);

      // 移动文件或文件夹
      fs.renameSync(oldPath, newPath);
    });

    // 删除空的最外层文件夹
    fs.rmSync(outerFolder, { recursive: true });
    console.log(`已删除最外层文件夹并提升内容：${outerFolder}`);
  } else {
    console.log('最外层不是文件夹');
  }
}