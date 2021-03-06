import chalk from "chalk";
import { CreateCommandOptions } from "../steps/types";
import { EventPromised } from "../utils/eventPromised";
import {
  normalizeOptions,
  ensureProjectDir,
  createPackageJson,
  createReadme,
  createFrontitySettings,
  cloneStarterTheme,
  installDependencies,
  downloadFavicon,
  revertProgress,
} from "../steps";

const defaultOptions: CreateCommandOptions = {
  path: process.cwd(),
  typescript: false,
  packages: [],
  theme: "@frontity/mars-theme",
};

/**
 * The types of events supported by the EventEmitter generated by `EventPromised`.
 */
type EventTypes = "error" | "message" | "subscribe";

/**
 * The create command, exported to be used programatically.
 *
 * @param options - The options of the create command. Defined by {@link
 * CreateCommandOptions}.
 *
 * @returns An instance of {@link EventPromised}, which is a promise that can
 * also send events using an EventEmitter.
 */
export default (options?: CreateCommandOptions) =>
  // EventPromised is a combination of EventEmitter and Promise.
  new EventPromised<EventTypes>((resolve, reject, emit) => {
    // Run an async action to be able to use `await`.
    (async () => {
      let step: Promise<any>;
      let dirExisted: boolean;

      // 1. Parses and validates options.
      const {
        name,
        theme,
        path,
        typescript,
      }: CreateCommandOptions = normalizeOptions(defaultOptions, options);

      process.on("SIGINT", async () => {
        if (typeof dirExisted !== "undefined")
          await revertProgress(dirExisted, path);
      });

      try {
        // 2. Ensures that the project dir exists and is empty.
        step = ensureProjectDir(path);
        emit("message", `Ensuring ${chalk.yellow(path)} directory.`, step);
        dirExisted = await step;

        // 3. Creates `README.md`
        step = createReadme(name, path);
        emit("message", `Creating ${chalk.yellow("README.md")}.`, step);
        await step;

        // 3. Creates `package.json`.
        step = createPackageJson(name, theme, path);
        emit("message", `Creating ${chalk.yellow("package.json")}.`, step);
        await step;

        // 4. Creates `frontity.settings`.
        const extension = typescript ? "ts" : "js";
        step = createFrontitySettings(extension, name, path, theme);
        emit(
          "message",
          `Creating ${chalk.yellow(`frontity.settings.${extension}`)}.`,
          step
        );
        await step;

        // 5. Clones the theme inside `packages`.
        step = cloneStarterTheme(theme, path);
        emit("message", `Cloning ${chalk.green(theme)}.`, step);
        await step;

        // 6. Installs dependencies.
        step = installDependencies(path);
        emit("message", `Installing dependencies.`, step);
        await step;

        // 7. Download favicon.
        step = downloadFavicon(path);
        emit("message", `Downloading ${chalk.yellow("favicon.ico")}.`, step);
        await step;
      } catch (error) {
        if (typeof dirExisted !== "undefined")
          await revertProgress(dirExisted, path);
        reject(error);
      }
    })().then(resolve);
  });
