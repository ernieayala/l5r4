/** A sheet whose options name two actions; `spread` comes from elsewhere and is not its own. */
const spread = { elsewhere() {} };

export default class FixtureSheet {
  static DEFAULT_OPTIONS = {
    actions: {
      clicked: FixtureSheet.onClick,
      "quoted-name": FixtureSheet.onClick,
      ...spread
    }
  };

  /** Does nothing. */
  static onClick() {}
}
