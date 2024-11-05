# NyarchUpdater
![nyarchupdater-screenshots](https://github.com/user-attachments/assets/346f87aa-3d7e-481d-bc10-3c8702698cba)

Nyarch Updater is a simple tool to update your Nyarch installation including:
- Release updates
- Packages updates

Through a simple yet beautiful interface.


> Warning: This tool is only available for Nyarch Linux users. If you are not using Nyarch Linux, you can't use this tool.


## Installation

### Windows

Why the hell do you wanna use Nyarch Updater on windows?

### Flatpak

You can install Nyarch Updater via Flatpak. It should be pre-installed from Nyarch installation.

### Manual

You will need flatpak-builder to build Nyarch Updater. You can install it by running the following command:

```bash
sudo pacman -S flatpak-builder
```

Then, you can build Nyarch Updater by running the following commands:

```bash
git clone https://github.com/NyarchLinux/NyarchUpdater.git
cd NyarchUpdater
chmod +x install.sh
sudo ./install.sh
```

Nyarch Updater should now be installed on your system.

### Development

If you want to develop Nyarch Updater, you can clone the repository and start developing.

```bash
git clone https://github.com/NyarchLinux/NyarchUpdater.git
cd NyarchUpdater
```

You'll need [Gnome Builder](https://wiki.gnome.org/Apps/Builder), you can get it from [Flatpak](https://flathub.org/apps/org.gnome.Builder). Then, simply open the project with Gnome Builder to run it, and edit either in Gnome Builder or in your favorite text editor.

## Usage

Thanks to its beautiful simple interface, you can easily update your Nyarch installation by clicking the respective Update buttons for both the release updates and the package updates.

## License

**This project is licensed under the GNU General Public License v3.0 - see the [COPYING](COPYING) file for details.**
