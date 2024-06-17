# NyarchUpdater
Nyarch Updater is a simple tool to update your Nyarch installation including:
- Release updates
- Packages updates

Through a simple yet beautiful interface.

> Warning: This tool is only available for Nyarch Linux users. If you are not using Nyarch Linux, you can't use this tool.
> 
> Also the tool itself is not ready/developed yet. Don't try it for now.

## Installation

### Windows

Why the hell do you wanna use Nyarch Updater on windows?

### Flatpak

You can install Nyarch Updater via Flatpak. It should be pre-installed from Nyarch installation.

### Manual

You will need [NodeJS](https://nodejs.org) **V16-18 (only)** with node-gyp. You can install it via `npm install -g node-gyp` or `yarn global add node-gyp`.

Please refer to [node-gtk](https://github.com/romgrk/node-gtk?tab=readme-ov-file#installing-and-building)'s installation guide for more information.

First, you will need to clone this repository:

```bash
git clone https://github.com/NyarchLinux/NyarchUpdater.git
```

Then, you will need to install the dependencies:
    
```bash
npm install
```

> Ensure you are in the NyarchUpdater directory before doing any other step!
> ```bash
> cd NyarchUpdater
> ```

Then, you can run the updater:

```bash
npm run start
```

<!-- TODO write the packaging and installation through pkg. -->

## Usage

Thanks to its beautiful simple interface, you can easily update your Nyarch installation by clicking the respective Update buttons for both the release updates and the package updates.

## License

**This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.**