{
  inputs.nixpkgs.url = "nixpkgs/nixos-20.09";

  outputs = { self, nixpkgs }:

    let
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
      systems = [ "x86_64-linux" "aarch64-linux" "i686-linux" "x86_64-darwin" ];
    in {

      overlay = final: prev: {
        bracketcounter = prev.pkgs.callPackage ./. { src = self; };
      };

      packages = forAllSystems (system: {
        bracketcounter = (import nixpkgs {
          inherit system;
          overlays = [ self.overlay ];
        }).bracketcounter;
      });

      defaultPackage =
        forAllSystems (system: self.packages.${system}.bracketcounter);

      checks =
        forAllSystems (system: { build = self.defaultPackage.${system}; });

    };
}
