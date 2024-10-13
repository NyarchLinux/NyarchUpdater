application_id = 'moe.nyarchlinux.updater'

scalable_dir = 'hicolor' / 'scalable' / 'apps'
install_data(
  scalable_dir / ('@0@.svg').format(application_id),
  install_dir: get_option('datadir') / 'icons' / scalable_dir
)

symbolic_dir = 'hicolor' / 'symbolic' / 'apps'
install_data(
  symbolic_dir / ('@0@-symbolic.svg').format(application_id),
  install_dir: get_option('datadir') / 'icons' / symbolic_dir
)
symbolic_dir = join_paths(get_option('datadir'), 'icons/hicolor/symbolic/apps')
install_data (
    'check-round-outline-symbolic.svg',
    'left-large-symbolic.svg',
    'right-large-symbolic.svg',
    install_dir: symbolic_dir
)