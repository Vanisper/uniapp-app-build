import fs from "node:fs";
import path from "node:path";
import ProgressBar from "progress";
import AdmZip from "adm-zip";
import StreamZip from "node-stream-zip";

/**
 * 流式解压缩文件
 * @param zipFilePath - 待解压的文件路径
 * @param outputDir - 解压到的目标目录
 * @param ignoreFiles - 忽略的文件或文件夹名列表
 * @param removeTopLevel - 是否智能删除顶层独立目录
 * @param onProgress - 进度反馈回调
 */
export function unzipFile(
  zipFilePath: string,
  outputDir: string,
  ignoreFiles: string[] = [],
  removeTopLevel: "always" | "auto" | false = false,
  onProgress?: (progress: number) => void,
  encoding: string = 'GBK', // 默认编码为 GBK
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = new Date().getTime();
    const zip = new StreamZip.async({ file: zipFilePath });

    // 检查压缩包是否存在
    if (!fs.existsSync(zipFilePath)) {
      return reject(new Error(`文件 ${zipFilePath} 不存在`));
    }

    // 判断目标目录是否存在，如果不存在则创建
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    zip
      .entries()
      .then((entries) => {
        // 过滤掉忽略的文件（夹）
        const filteredEntries = Object.values(entries).filter(
          (entry) => !ignoreFiles.some((name) => entry.name.includes(name))
        );

        // 获取 entryName 的顶层目录名列表
        const topLevelDirs = new Set<string>();
        filteredEntries.forEach((entry) => {
          const topLevelDir = entry.name.split("/")[0];
          topLevelDirs.add(topLevelDir);
        });

        // 判断是否需要删除顶层独立目录
        let shouldRemoveTopLevel = false;
        if (topLevelDirs.size === 1) {
          const topLevelDir = Array.from(topLevelDirs)[0];
          if (removeTopLevel === "always") {
            shouldRemoveTopLevel = true;
          } else if (
            removeTopLevel === "auto" &&
            topLevelDir === path.basename(outputDir)
          ) {
            shouldRemoveTopLevel = true;
          }
        }

        // 计算总文件大小以便设置进度条
        const totalSize = filteredEntries.reduce(
          (acc, entry) => acc + entry.size,
          0
        );

        // 设置进度条
        const bar = new ProgressBar(":percent [:bar] :current/:total", {
          total: totalSize,
          width: 40,
          complete: "=",
          incomplete: " ",
          renderThrottle: 100, // 刷新频率
        });

        // 解压过滤后的文件
        filteredEntries.forEach(async (entry) => {
          let entryName = entry.name;
          // 如果需要移除顶层目录，修改 entryName
          if (shouldRemoveTopLevel) {
            entryName = entryName.split("/").slice(1).join("/");
          }

          const entryPath = path.join(outputDir, entryName);

          try {
            // 创建目录
            if (entry.isDirectory) {
              fs.mkdirSync(entryPath, { recursive: true });
            } else {
              // 获取文件流并写入目标文件
              const fileStream = fs.createWriteStream(entryPath);
              const stm = await zip.stream(entry.name);
              stm.pipe(fileStream);

              // 更新进度条
              stm.on("data", async (chunk) => {
                bar.tick(chunk.length); // 进度条更新
                if (onProgress) {
                  onProgress(bar.curr / bar.total); // 当前进度百分比
                }
                // zip文件关闭
                if (bar.complete) {
                  await zip.close();
                  console.log(
                    `解压完成！文件已解压到：${outputDir}. 耗时: ${
                      (new Date().getTime() - start) / 1000.0
                    }秒`
                  );
                  resolve();
                }
              });

              // 监听结束事件
              stm.on("end", () => fileStream.close());
            }
          } catch (error) {
            console.error(
              `解压文件失败: ${entry.name}. 耗时: ${
                (new Date().getTime() - start) / 1000.0
              }秒`
            );
            return reject(error);
          }
        });
      })
      .catch(reject);
  });
}

/**
 * 压缩文件夹到 .zip 文件
 * @param sourceDir - 待压缩的文件夹路径
 * @param outputZipPath - 输出的 .zip 文件路径
 */
export function zipDirectory(
  sourceDir: string,
  outputZipPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = new Date().getTime();
    try {
      // 创建一个新的 ZIP 实例
      const zip = new AdmZip();

      // 检查源目录是否存在
      if (!fs.existsSync(sourceDir)) {
        reject(new Error(`目录 ${sourceDir} 不存在`));
        return;
      }

      // 添加文件夹内容到压缩包
      zip.addLocalFolder(sourceDir);

      // 将压缩包写入磁盘
      zip.writeZip(outputZipPath);

      console.log(
        `压缩完成！文件已保存为：${outputZipPath}. 耗时: ${
          (new Date().getTime() - start) / 1000.0
        }秒`
      );
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}
