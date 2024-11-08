import fs from "node:fs";

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
