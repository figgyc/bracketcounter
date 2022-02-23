{
  description = "YouTube comment counter (for NixOS module, also install bracketcounter-web)";

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs";

  outputs = { self, nixpkgs, flake-utils }:
    {
      # Nixpkgs overlay providing the application
      overlay =
        (final: prev: rec {
          # The application
          bracketcounter = let
            yarn-run = "yarn run --offline --ignore-scripts --ignore-engines --";
          in prev.pkgs.mkYarnPackage {
            src = ./.;
            name = "bracketcounter";
            postBuild = ''
              ${yarn-run} tsc
              chmod +x deps/yt-comments/dist/yt-comments.js
            '';
            publishBinsFor = ["yt-comments"];
          };
        });

      # NixOS module
      nixosModules.bracketcounter = { config, lib, pkgs, ... }: with lib; {
        options.services.bracketcounter = with types; {

          enable = mkEnableOption "Bracketcounter web system.";
          # staticPath = lib.mkPathOption "Path to be served at /static";
          #configFile = lib.mkPathOption "config.json";
          fqdn = mkOption {
            type = nullOr str;
            default = null;
            example = "bfb.figgyc.uk";
            description = ''The domain by which to serve the vhost.'';
          };

          configFile = mkOption {
            type = nullOr path;
            default = null;
            example = "/root/config.toml";
            description = ''Config file.'';
          };

          staticPath = mkOption {
            type = nullOr path;
            default = null;
            example = "/root/static";
            description = ''Path to serve at /static'';
          };
          # additional options ...
        };

        config = let
          cfg = config.services.bracketcounter;
          user = config.users.users.bracketcounter.name;
          group = config.users.groups.bracketcounter.name;
        in
          lib.mkIf cfg.enable {

            users.users.bracketcounter = {
              inherit group;
              isSystemUser = true;
            };
            users.groups.bracketcounter = { };

            systemd.services.bracketcounter = {
              after = [ "network.target" ];
              path = with pkgs; [ openssl ];
              serviceConfig = {
                User = user;
                Group = group;
                ExecStart = "${pkgs.bracketcounter}/bin/yt-comments ${cfg.configFile}";
                LimitNOFILE = "1048576";
                LimitNPROC = "64";
                PrivateTmp = "true";
                PrivateDevices = "true";
                ProtectHome = "true";
                ProtectSystem = "strict";
                AmbientCapabilities = "CAP_NET_BIND_SERVICE";
                StateDirectory = "bracketcounter";
              };
              wantedBy = [ "multi-user.target" ];
            };

            services.nginx = {
              virtualHosts = {

                ${cfg.fqdn} = {
                  enableACME = true;
                  forceSSL = true;
                  root = "/var/www";

                  locations."/" = {
                    root = "${pkgs.bracketcounter-web}/libexec/bracketcounter-web/deps/bracketcounter-web/dist/";
                  };
                  locations."/socket" = {
                    proxyPass = "http://localhost:9764"; # without a trailing /
                    proxyWebsockets = true;
                  };

                  locations."/static/" = {
                    alias = "${cfg.staticPath}/";
                  };
                };
              };
            };
          };
      };

    } // (flake-utils.lib.eachSystem ["x86_64-linux" "aarch64-linux"] (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ self.overlay ];
        };
      in
        rec {
          packages.bracketcounter = pkgs.bracketcounter;
          defaultPackage = pkgs.bracketcounter;
        }));
}
