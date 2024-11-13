import fs from "node:fs";
import path from "node:path";

import { UserManifestConfig, AppPlus } from "@uni-helper/vite-plugin-uni-manifest";

enum DPI_DRAWABLE_DIR {
  HDPI = "drawable-hdpi",
  XHDPI = "drawable-xhdpi",
  XXHDPI = "drawable-xxhdpi",
  XXXHDPI = "drawable-xxxhdpi",
}

type ABI_FILTERS = "armeabi-v7a" | "arm64-v8a" | "x86" | "x86_64";

const app_icons_size_map = {
  [DPI_DRAWABLE_DIR.HDPI]: 72,
  [DPI_DRAWABLE_DIR.XHDPI]: 96,
  [DPI_DRAWABLE_DIR.XXHDPI]: 144,
  [DPI_DRAWABLE_DIR.XXXHDPI]: 192,
  /** 提交给app store使用的图标 */
  "app-store": 1024,
};

/**
 * TODO: app模块与权限的映射
 */
const app_modules_map = {

}

export class ProcessAndroid {
  static MAINIFEST_FILE = "manifest.json";
  mainifest: UserManifestConfig;
  app_dist_path: string;

  // #region 基础配置
  dcloud_appid: string = "__UNI__A";
  app_name: string = "UniApp";
  app_description: string = "";
  app_version: [number, number, number] = [0, 0, 0];
  app_version_code: number = 1;
  // #endregion

  // #region 图标配置
  app_icons_assets_dir = "unpackage/res/icons";
  app_icons_exts: string[] = ["png"];
  app_icons: string[] = [];
  app_icons_size_map = app_icons_size_map;
  // #endregion

  // #region TODO: splash 配置
  // app_splash_assets_dir: string = "unpackage/res/splash";
  // app_splash_exts: string[] = ["png"];
  // app_splash: string[] = [];
  // #endregion

  // #region app模块配置 | TODO: uniapp的模块的勾选对应的是一些权限的添加，此处暂未处理，需要显式配置权限(app_permissions)
  app_modules: AppPlus["modules"] = {};
  // #endregion

  // #region app权限配置
  app_permissions: string[] = [];
  /**
   * 默认权限配置
   * 
   * @link <https://uniapp.dcloud.net.cn/tutorial/app-permission-android.html#modules>
   */
  app_permissions_default: string[] = [
    // <!-- 拥有完全的网络访问权限 -->
    "android.permission.INTERNET",

    // <!-- 读取您共享存储空间中的内容 -->
    "android.permission.READ_EXTERNAL_STORAGE",
    // <!-- 修改或删除您共享存储空间中的内容 -->
    "android.permission.WRITE_EXTERNAL_STORAGE",
    // <!-- 读取共享存储空间中的图片文件 -->
    "android.permission.READ_MEDIA_IMAGES",
    // <!-- 从共享存储空间读取视频文件 -->
    "android.permission.READ_MEDIA_VIDEO",
    // <!-- 从共享存储空间读取用户选择的图片和视频文件 -->
    "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",

    // <!-- 读取手机状态和身份 -->
    "android.permission.READ_PHONE_STATE",
    // <!-- 查看网络连接 -->
    "android.permission.ACCESS_NETWORK_STATE",
    // <!-- 查看WLAN连接 -->
    "android.permission.ACCESS_WIFI_STATE",

    // 获取设备标识信息oaid在华硕设备上需要用到的权限
    "com.asus.msa.SupplementaryDID.ACCESS",
    // 设置应用角标功能在华为设备上需要用到的权限
    "com.huawei.android.launcher.permission.CHANGE_BADGE",
    // 设置应用角标功能在OPPO设备上需要用到的权限 <https://dev.vivo.com.cn/documentCenter/doc/787>
    "com.vivo.notification.permission.BADGE_ICON",
    // <!-- 安装应用程序 -->
    "android.permission.INSTALL_PACKAGES",
    // <!-- 请求安装文件包 -->
    "android.permission.REQUEST_INSTALL_PACKAGES",
  ];
  // #endregion

  // #region app其他配置
  min_sdk_version: number = 21;
  abi_filters: ABI_FILTERS[] = ["arm64-v8a"];
  // #endregion

  constructor(dist_path: string) {
    this.app_dist_path = dist_path;
    this.init();
  }

  private init() {
    this.initMainifest();

    if (this.mainifest) {
      this.initBaseConfig();
      this.initIcons();
      // this.initSplash();
      this.initModules();
      this.initPermissions();
    }
  }

  private initMainifest() {
    const mainifest_path = path.join(this.app_dist_path, ProcessAndroid.MAINIFEST_FILE);
    if (fs.existsSync(mainifest_path)) {
      this.mainifest = JSON.parse(fs.readFileSync(mainifest_path, "utf-8"));
    }
  }

  private initBaseConfig() {
    if (this.mainifest) {
      this.dcloud_appid = this.mainifest.id;
      this.app_name = this.mainifest.name;
      this.app_description = this.mainifest.description;
      this.app_version = this.mainifest.version?.name?.split(".").map((v) => parseInt(v)) as typeof this.app_version;
      this.app_version_code = parseInt(this.mainifest.version?.code || "1");

      this.min_sdk_version = this.mainifest["plus"]?.distribute?.android?.minSdkVersion || this.min_sdk_version;
      this.abi_filters = this.mainifest["plus"]?.distribute?.android?.abiFilters || this.abi_filters;
    }
  }

  private initIcons() {
    if (this.mainifest) {
      const icons = this.mainifest["plus"]?.distribute?.icons?.android;
      if (icons) {
        this.app_icons = Object.values(icons);
      }
    }
  }

  // private initSplash() {
  //   if (this.mainifest) {
  //     const splash = this.mainifest["app-plus"]?.distribute?.splash?.android;
  //     if (splash) {
  //       this.app_splash = Object.values(splash);
  //     }
  //   }
  // }

  private initModules() {
    if (this.mainifest) {
      const modules = this.mainifest.permissions;
      if (modules) {
        this.app_modules = modules;
      }
    }
  }

  private initPermissions() {
    if (this.mainifest) {
      const permissions = this.mainifest["plus"]?.distribute?.google?.permissions;
      if (permissions) {
          const reg = /android:name="([^"]+)"/g;
          const permissions_list = permissions.map(item => item.match(reg)).filter(item => item !== null).flat().map(item => item.replace(reg, "$1"));
          this.app_permissions = permissions_list;
      }
    }
  }
}
