/* Offline shell. The build replaces this revision whenever the app changes. */
// CacheStorage is origin-wide: separate root, Pages and sibling installations.
// The raw colon cannot occur inside encodeURIComponent output, including hyphen-led subpaths.
const PREFIX = "nightfall-shell-" + encodeURIComponent(new URL(self.registration.scope).pathname) + ":";
const CACHE = PREFIX + "4349872f30bb";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/werewolf-512.png",
  "werewolf/home.png",
  "werewolf/night.png",
  "werewolf/day.png",
  "werewolf/madman.webp",
  "werewolf/werewolf.webp",
  "werewolf/villager.webp",
  "werewolf/doctor.webp",
  "werewolf/seer.webp",
  "werewolf/chef.webp",
  "werewolf/mayor.webp",
  "werewolf/templar.webp",
  "werewolf/muted.webp",
  "werewolf/jester.webp",
  "werewolf/necromancer.webp",
  "werewolf/bodyguard.webp",
  "werewolf/sheriff.webp",
  "werewolf/serialkiller.webp",
  "werewolf/visitor.webp",
  "werewolf/survivor.webp",
  "werewolf/psychic.webp",
  "werewolf/celebrity.webp",
  "werewolf/celebrity-new.webp",
  "werewolf/celebrity-spotlight.webp",
  "werewolf/celebrity-gala.webp",
  "werewolf/detective.webp",
  "werewolf/instigator.webp",
  "werewolf/strongwolf.webp",
  "werewolf/sickman.webp",
  "werewolf/lonewolf.webp",
  "werewolf/wolfpup.webp",
  "werewolf/journalist.webp",
  "werewolf/raven.webp",
  "werewolf/rabidwolf.webp",
  "werewolf/whitewolf.webp",
  "werewolf/gambler.webp",
  "werewolf/mindflayer.webp",
  "werewolf/intelligence.webp",
  "werewolf/thief.webp",
  "werewolf/police.webp",
  "werewolf/hypnowolf.webp",
  "werewolf/charmer.webp",
  "werewolf/charmer-new.webp",
  "werewolf/charmer-moonlight.webp",
  "werewolf/charmer-starlight.webp",
  "werewolf/charmer-sapphire.webp",
  "werewolf/charmer-sunrise.webp",
  "werewolf/barlow.ttf",
  "werewolf/condensed.ttf",
  "werewolf/avatars/photo-01-20261106.png",
  "werewolf/avatars/photo-02-20261106.png",
  "werewolf/avatars/photo-03-20261106.jpg",
  "werewolf/avatars/player4.webp",
  "werewolf/avatars/photo-05-20261106.jpg",
  "werewolf/avatars/photo-06-20261106.png",
  "werewolf/avatars/photo-07-20261106.png",
  "werewolf/avatars/photo-08-20261106.jpg",
  "werewolf/avatars/player11.webp",
  "werewolf/avatars/player13.webp",
  "werewolf/avatars/player15.webp",
  "werewolf/avatars/player16.webp",
  "werewolf/avatars/player17.webp",
  "werewolf/avatars/player18.webp",
  "werewolf/avatars/player19.webp",
  "werewolf/avatars/player20.webp",
  "werewolf/avatars/player21.webp",
  "werewolf/avatars/player23.webp",
  "werewolf/avatars/player24.webp",
  "werewolf/audio/v3/cues-tap.wav",
  "werewolf/audio/v3/cues-confirm.wav",
  "werewolf/audio/v3/cues-invalid.wav",
  "werewolf/audio/v3/cues-select.wav",
  "werewolf/audio/v3/cues-add.wav",
  "werewolf/audio/v3/cues-remove.wav",
  "werewolf/audio/v3/cues-randomize.wav",
  "werewolf/audio/v3/cues-navigate.wav",
  "werewolf/audio/v3/cues-start.wav",
  "werewolf/audio/v3/cues-handoff.wav",
  "werewolf/audio/v3/cues-reveal.wav",
  "werewolf/audio/v3/cues-discussion.wav",
  "werewolf/audio/v3/cues-warning.wav",
  "werewolf/audio/v3/cues-time-up.wav",
  "werewolf/audio/v3/cues-vote-open.wav",
  "werewolf/audio/v3/cues-elimination.wav",
  "werewolf/audio/v3/cues-divided.wav",
  "werewolf/audio/v3/cues-mvp.wav",
  "werewolf/audio/v3/cues-win-wolf.wav",
  "werewolf/audio/v3/cues-win-village.wav",
  "werewolf/audio/v3/cues-win-jester.wav",
  "werewolf/audio/v3/cues-win-serialkiller.wav",
  "werewolf/audio/v3/cues-win-raven.wav",
  "werewolf/audio/v3/cues-win-whitewolf.wav",
  "werewolf/audio/v3/cues-win-mindflayer.wav",
  "werewolf/audio/v3/cues-win-friends.wav",
  "werewolf/audio/v3/cues-win-wolf-friends.wav",
  "werewolf/audio/v3/cues-win-draw.wav",
  "werewolf/audio/card-reveal/v3/reveal-01.wav",
  "werewolf/audio/card-reveal/v3/reveal-02.wav",
  "werewolf/audio/card-reveal/v3/reveal-03.wav",
  "werewolf/audio/card-reveal/v3/reveal-04.wav",
  "werewolf/audio/card-reveal/v3/reveal-05.wav",
  "werewolf/audio/card-reveal/v3/reveal-06.wav",
  "werewolf/audio/card-reveal/v3/reveal-07.wav",
  "werewolf/audio/card-reveal/v3/reveal-08.wav",
  "werewolf/audio/card-reveal/v3/reveal-09.wav",
  "werewolf/audio/card-reveal/v3/reveal-10.wav",
  "werewolf/audio/card-reveal/v3/reveal-11.wav",
  "werewolf/audio/card-reveal/v3/reveal-12.wav",
  "werewolf/audio/card-reveal/v3/reveal-13.wav",
  "werewolf/audio/card-reveal/v3/reveal-14.wav",
  "werewolf/audio/phase/v1/night-start.wav",
  "werewolf/audio/phase/v1/meeting-start.wav",
  "werewolf/audio/voted-out/v2/voted-out-01.wav",
  "werewolf/audio/voted-out/v2/voted-out-02.wav",
  "werewolf/audio/voted-out/v2/voted-out-03.wav",
  "werewolf/audio/voted-out/v2/voted-out-04.wav",
  "werewolf/audio/voted-out/v2/voted-out-05.wav",
  "werewolf/audio/voted-out/v2/voted-out-06.wav",
  "werewolf/audio/voted-out/v2/voted-out-07.wav",
  "werewolf/audio/voted-out/v2/voted-out-08.wav",
  "werewolf/audio/game-end/v1/game-end-01.wav",
  "werewolf/audio/game-end/v1/game-end-02.wav",
  "werewolf/audio/game-end/v1/game-end-03.wav",
  "werewolf/audio/game-end/v1/game-end-04.wav",
  "werewolf/audio/game-end/v1/game-end-05.wav",
  "werewolf/audio/morning-death/v1/morning-death-01.wav",
  "werewolf/audio/morning-death/v1/morning-death-02.wav",
  "werewolf/audio/morning-death/v1/morning-death-03.wav",
  "werewolf/audio/ballot/v1/ballot-enderman.wav",
  "werewolf/audio/ballot/v1/ballot-notifi.wav",
  "werewolf/audio/ballot/v1/ballot-enemy.wav",
  "werewolf/audio/buttons/v2/button-tap.wav",
  "werewolf/audio/buttons/v2/button-confirm.wav",
  "werewolf/audio/buttons/v2/button-invalid.wav",
  "werewolf/audio/buttons/v2/button-select.wav",
  "werewolf/audio/buttons/v2/button-add.wav",
  "werewolf/audio/buttons/v2/button-remove.wav",
  "werewolf/audio/buttons/v2/button-randomize.wav",
  "werewolf/audio/buttons/v2/button-navigate.wav"
];

// Immutable build metadata; the build fills both placeholders.
const DIGESTS = {"./":{"sha256":"4a246502786b7cb797d434f61ec08b375370d3e76096c66959c4bd5c4b3c166a","size":1529468},"index.html":{"sha256":"4a246502786b7cb797d434f61ec08b375370d3e76096c66959c4bd5c4b3c166a","size":1529468},"manifest.webmanifest":{"sha256":"38fa605b11a58925cce86316a4781867c187307a482cb678d81c847b1f1b23b7","size":624},"icons/werewolf-512.png":{"sha256":"3d1d6e8ab0b46d72ed1a8ada60e3165363ae89ebea5ea3998e001b7def49dd89","size":287462},"werewolf/home.png":{"sha256":"0dad68c7588ca04dad15394b4337da4215ca842d013f1a3a30d08627450070f3","size":1489236},"werewolf/night.png":{"sha256":"59472006ee4b4d80384c27fbd1d49c3da0c1f49a812ff0d9362000e9fe5ec929","size":1689981},"werewolf/day.png":{"sha256":"e317075fd8fc58af67299402f5c18396b516ba55d248bf78022a288b9f966e54","size":1793383},"werewolf/madman.webp":{"sha256":"00debe50fc4b49790218f98270b6c5a24a4a4424f00ad313acd161f7ec3ee31c","size":962180},"werewolf/werewolf.webp":{"sha256":"db596c558c787af2713ea06651071e5a1e45935bbab4c5a047644624884348fb","size":898502},"werewolf/villager.webp":{"sha256":"c5a0c34062cd7c725e98ca253609da5e726f9d88b16b94ab42ab0b5eb6f5aaba","size":1015448},"werewolf/doctor.webp":{"sha256":"11fbc9d608af15ca7e3b4d150a15b647e82a41cfeed73546cbe997b1dbc84f89","size":969932},"werewolf/seer.webp":{"sha256":"03035c1b90e967923cc496b491110aad33aa8c29928217691c0fd78ba75caf6c","size":1006222},"werewolf/chef.webp":{"sha256":"5389c94a6a9ba679e8b697fa1cf3683fdb37c7dd04ab0c785835980f48704484","size":1017646},"werewolf/mayor.webp":{"sha256":"074a708f2c169c248596efca7fc88969ba4123b4f4de5c0afb2a9aad442b4ed9","size":977478},"werewolf/templar.webp":{"sha256":"14da6d2b13d5973339dbe9395d989797f3a47432483d49243c186cf5c8f03823","size":1014288},"werewolf/muted.webp":{"sha256":"8fdaef071523fb06d0609fcca6a572330b96f7ab00d512364607761647f5afa1","size":940108},"werewolf/jester.webp":{"sha256":"e46212ba1927ec55a378476dc2578c2457fd2c71ef15b8ca41cc786e1d5fb97b","size":989708},"werewolf/necromancer.webp":{"sha256":"3d3c7013e0ce7c7d979abcf9e9b6930c60fbe7b5196f8fd3ed820ee3822994cc","size":983858},"werewolf/bodyguard.webp":{"sha256":"b3e3ef426f268bc97d68e28bf5fa813bc61336cf642187e5252dc896d23d6c4d","size":833652},"werewolf/sheriff.webp":{"sha256":"19683e619f0cc5e4c7c82afd1dcee3d5db597148b31f24a770be9e6e34c6ff00","size":980856},"werewolf/serialkiller.webp":{"sha256":"c6e96988b19a03b448729e5accb6c8f48757625c31ede5534707326721c0a6e7","size":938592},"werewolf/visitor.webp":{"sha256":"a0ee53e56a4f8b4132cb80a6df3a0dff2fde96cc21c1bc8d5937f246787fc2ec","size":1025312},"werewolf/survivor.webp":{"sha256":"bbf82c87d0a0ea95ba45dfe9f7c7f303f3cbadd3f7ed692e9e7e7425f7607647","size":962736},"werewolf/psychic.webp":{"sha256":"67be227b95ef2ae13b06174198cceb31d4fef391d9341ec42de2e266dcd39b15","size":981766},"werewolf/celebrity.webp":{"sha256":"85366aa0efb156c82ebfa4409a7da97a367b958c385c327a9527f114c58c313e","size":391650},"werewolf/celebrity-new.webp":{"sha256":"85366aa0efb156c82ebfa4409a7da97a367b958c385c327a9527f114c58c313e","size":391650},"werewolf/celebrity-spotlight.webp":{"sha256":"361b41e20f45de58111dfd992287118786c251045a3cefdb800bf45c819ee014","size":914766},"werewolf/celebrity-gala.webp":{"sha256":"888bf2ffa2de74a199b2eacb6395bc014bb07ae2f79f0a4ba79909534c708264","size":125308},"werewolf/detective.webp":{"sha256":"0ca42504df0c9f6f161e6a3c58c604474276365d7a2c333135abc1b24c960f3a","size":989148},"werewolf/instigator.webp":{"sha256":"6591635b6a25da799f219a5e471c7d6eb1b18e18adac570ee5e5be81a4c77b87","size":1027874},"werewolf/strongwolf.webp":{"sha256":"fb642b3172e24996f14aebc9e1e60640ca06c12145d2c3401f78fb85c215969e","size":986432},"werewolf/sickman.webp":{"sha256":"3d6b1a1e714b764c70d01f937f2ee69258ecb57ff1dd1ae3288e947ac4a412c1","size":994216},"werewolf/lonewolf.webp":{"sha256":"4f10a368e15ef21958f6f7ccc2115827d0fb1f2af799543046ecfc43bd7966df","size":79372},"werewolf/wolfpup.webp":{"sha256":"eb305e59b89130348fff32a7bc34bcf9b6b0a257a03ae2bb62eded7d91590d7e","size":978178},"werewolf/journalist.webp":{"sha256":"554e914977bc818986f048048c45673e302c291f2eeca87892097a9d8d1de9c2","size":1002300},"werewolf/raven.webp":{"sha256":"411e0303d7307b64fe991521c01d98b1a826c0ed44023b2fc08cbb44f220acf1","size":1039680},"werewolf/rabidwolf.webp":{"sha256":"1877c50b8b979c7993b76c3144885c27c7160f2de94d768ec191945ae1da76b9","size":1044492},"werewolf/whitewolf.webp":{"sha256":"a75426f8deff0db3c1f59e19c4c94eafecbd7a4bcc8777c5f48027bb3821a36c","size":1039022},"werewolf/gambler.webp":{"sha256":"d0c3693e98ba92af62bbbfbb2100f16ad35c70f4f6fd2798ca0b318c943f430f","size":1086080},"werewolf/mindflayer.webp":{"sha256":"ddd91b726d62366927889ba8b9b8699349726a5a2121c3c68e07d101961ce2d6","size":1060820},"werewolf/intelligence.webp":{"sha256":"e9c0c5b453b6070c2b9425e2cd54874464f6abe5176effcfa1200a6626b55c08","size":940054},"werewolf/thief.webp":{"sha256":"527887a40e461cdd0d5ca1c3ce697ef47c7f905d3842b1c9980cebc14f77b324","size":968208},"werewolf/police.webp":{"sha256":"6549862d274ff27bfb8a6beeb830e569b642bed521b6b79a5a78713e9ae0c47a","size":1081528},"werewolf/hypnowolf.webp":{"sha256":"c00e48e6d46223ef1022295f74c28ff7b0b260807bd7eb173b5b872a589fd0f8","size":995278},"werewolf/charmer.webp":{"sha256":"44af7163d0e395182d2c3a275a5c9d020ee7414ea05e90e715c9106b489c9afa","size":131992},"werewolf/charmer-new.webp":{"sha256":"2a0c362e23b6b036f5f21e4618a2aee68ae12c4efc40f64c9c9d60366a787f0a","size":555944},"werewolf/charmer-moonlight.webp":{"sha256":"4ad30af9fa43181b3aea691b27052188cc7c5429ed78c0da97f6bc56f21ab122","size":110744},"werewolf/charmer-starlight.webp":{"sha256":"44af7163d0e395182d2c3a275a5c9d020ee7414ea05e90e715c9106b489c9afa","size":131992},"werewolf/charmer-sapphire.webp":{"sha256":"2e7fbb7005f8992d7999ff91f0449e1d5a554572ff1ffe913320acd9244b080a","size":105056},"werewolf/charmer-sunrise.webp":{"sha256":"2f52d0196214ae54ef36dac2d0b22971d65a471e267103c071c2e723a7991de7","size":64932},"werewolf/barlow.ttf":{"sha256":"86577cb32f8abe3673db53ca0f4221e6856751a4f6730c867e00f720f8bb1fc5","size":108348},"werewolf/condensed.ttf":{"sha256":"e74b750df582c608f35db467b711b2b60d2217618e85e60b72b42dfd00446cab","size":110828},"werewolf/avatars/photo-01-20261106.png":{"sha256":"f1716152ffa08f26c1bc4ddb754f11ff9bac3f276385d66c48f5dc90a2685f8b","size":30026},"werewolf/avatars/photo-02-20261106.png":{"sha256":"4651d429a4248d54c3ea2ca34fd7820656ffd356b280ac2bda3bf5670edc2355","size":40909},"werewolf/avatars/photo-03-20261106.jpg":{"sha256":"efb5de3ade0d9a51f9396ac8985045d36f8a3cf8088471655e0760489f02806a","size":3486},"werewolf/avatars/player4.webp":{"sha256":"2f2eaedc89cff9b469bc442ad8dcc42f21bb54034348adaf0a1cce73a9d72d57","size":5952},"werewolf/avatars/photo-05-20261106.jpg":{"sha256":"68a252b41288c574fee1ad20a898d7543e60a9452e3c5bb455b0bf45674d71ad","size":6353},"werewolf/avatars/photo-06-20261106.png":{"sha256":"712cc31b5b0a8ff5d78f24b54bdf1f4a0ce2dbb554da91beb994547683776e65","size":1771454},"werewolf/avatars/photo-07-20261106.png":{"sha256":"862efa147d9e4694ccaad41018afff789d2525f288b5d337cff60e0d4cae5f97","size":21868},"werewolf/avatars/photo-08-20261106.jpg":{"sha256":"dd28c8ce674ed1dcebaa4bc304f1ca15d5ecde5aa2eeccf44062eac5b62fb812","size":2784},"werewolf/avatars/player11.webp":{"sha256":"98f4a557442b029cda5a44e17f8eebedd97924d2acaa195c4ce5c7e560b940c7","size":3244},"werewolf/avatars/player13.webp":{"sha256":"e9c1a01525847bad7c8a0755281312c2dbced0f7a520eb7f6462bf788e0b37b2","size":4868},"werewolf/avatars/player15.webp":{"sha256":"ae01abb8b645f62ea1f0c9ca653ffc972a77ff1061aab45a6325d40a281fe86b","size":4916},"werewolf/avatars/player16.webp":{"sha256":"d5753ec01efacbf222314c03d3d7171aac1eb99465945cee8d1bb28ee7ca9adb","size":4984},"werewolf/avatars/player17.webp":{"sha256":"a511925fee16e01562a86ab8f27bd9af45667267cfaf20a58d4604da9971c227","size":4638},"werewolf/avatars/player18.webp":{"sha256":"95048fd01e363bf54ad9ec53f5849bd3bcd1a821fc1aa18dc65c70251787c31d","size":5390},"werewolf/avatars/player19.webp":{"sha256":"4620bf0a0e8d255520b0347c421ac3077d1e2f39850a10bfd336cfa11e863439","size":4882},"werewolf/avatars/player20.webp":{"sha256":"9ea77dfa4a623b9f6a228b13008f5a50ceb712d78b6cc819e19f03f46525cce2","size":56474},"werewolf/avatars/player21.webp":{"sha256":"d31cbbc03105e3cd08c37604205be67d29743fe15f4c4504ac042241608b740e","size":49180},"werewolf/avatars/player23.webp":{"sha256":"28f3db86ed610874d59f9e6354d3b0a05ac259448b984aa7679b69b6b1a76955","size":65572},"werewolf/avatars/player24.webp":{"sha256":"b3512d44ae4121b379180356bc8b1f4149430825c150dd232e897c5832f98bdd","size":66772},"werewolf/audio/v3/cues-tap.wav":{"sha256":"1f16eae86ef6a5ec603ea52ce7a2a67bd0ea92d7703794d1bba745e4d4240562","size":4844},"werewolf/audio/v3/cues-confirm.wav":{"sha256":"179079e08d7a2d1680bd4aea5a4ae3f83e5e3c4caadc1d8888ffc5848f8c3e4b","size":9644},"werewolf/audio/v3/cues-invalid.wav":{"sha256":"5f084737e41e03eb1bb60ca0a276313c2b0b15d83ec15332f6c700303633f231","size":8204},"werewolf/audio/v3/cues-select.wav":{"sha256":"a11a71c0b8291668459004e70b51ae4fb370aa542d1a2646872b1ce9cdfde361","size":5804},"werewolf/audio/v3/cues-add.wav":{"sha256":"bec30e950a16d684a45bfc6a0f1db1d0ebe9d3d4c447eef17d4b4d3e3f92da2c","size":9164},"werewolf/audio/v3/cues-remove.wav":{"sha256":"a44a261e2210abf29ab5fc74f5dd9b909ef3ea2200381632a767a9cceb8d7ab5","size":9164},"werewolf/audio/v3/cues-randomize.wav":{"sha256":"bb58b4fc28a43041951268307950367f70d70d78527ec28ceeb04ca6c2285166","size":14444},"werewolf/audio/v3/cues-navigate.wav":{"sha256":"e22e846cfefc64cdf0f6ceec0ed4ce034b71413465ad36e23ddc223bb144b87e","size":7244},"werewolf/audio/v3/cues-start.wav":{"sha256":"6197723328428d13f5315ac6dda18adeb8d0f99a1a9f77500a655469b0766e01","size":31244},"werewolf/audio/v3/cues-handoff.wav":{"sha256":"bb265330aa9ae4f15a846c459281772b5cb143c38860af546ac8cd83a0d7bc8e","size":7244},"werewolf/audio/v3/cues-reveal.wav":{"sha256":"5abc2b4e4a00f5662de78c38dbd2851632b4a23751c37bbf21bea9459c7f4ec2","size":9644},"werewolf/audio/v3/cues-discussion.wav":{"sha256":"a7bed648e589c6e0f316c2cf3dce71f792bf204f83f83fa13ce351d9db5fec7b","size":14444},"werewolf/audio/v3/cues-warning.wav":{"sha256":"5d173339e3160f8daea1965c55be745b2330f026263be9ffd774fb494b98dc8e","size":12044},"werewolf/audio/v3/cues-time-up.wav":{"sha256":"a9e3edfa362666c458a215035cc214e889ef4ab152d470ac0cd5ef8daeda75da","size":19244},"werewolf/audio/v3/cues-vote-open.wav":{"sha256":"be417ad82b8fb5904ac314e705db226d2d3100fbf030d4fa042f67ca969402ee","size":15404},"werewolf/audio/v3/cues-elimination.wav":{"sha256":"440f863faf7563d0ec84f70f9ddb5b3ec931da5860896a3a3c00c1af18f87028","size":20204},"werewolf/audio/v3/cues-divided.wav":{"sha256":"af6723e32121c21b1ea886d521e9f0ed4a18b9252b2ec2f90ba41529d0161649","size":15404},"werewolf/audio/v3/cues-mvp.wav":{"sha256":"f6d3729a5ddcbf9b5ef5bcf10d796b4c118a30221ba09f8b5ee13bb571361b9f","size":26444},"werewolf/audio/v3/cues-win-wolf.wav":{"sha256":"58f41e5bbc4b19563027c4c56c8e8322ff3b324c8b5c42300fe36f71dc75b024","size":57644},"werewolf/audio/v3/cues-win-village.wav":{"sha256":"ebd14b7ac570b8347cc48d60a234bec0573a2391cdeb1cf129b570220ab086d9","size":57644},"werewolf/audio/v3/cues-win-jester.wav":{"sha256":"7499440ac2b659ff85f0e14fa60df10c90915ae6c58c0c35c3c67467e623904e","size":57644},"werewolf/audio/v3/cues-win-serialkiller.wav":{"sha256":"32a9300ac1ebf9727411594cd12f36010fae7a4e9579e079cb825724a3f62e86","size":57644},"werewolf/audio/v3/cues-win-raven.wav":{"sha256":"7fd9a5dd9092f3cdbaee60458230b23a058d503a49011ff25acb6ee8f0bd8f99","size":57644},"werewolf/audio/v3/cues-win-whitewolf.wav":{"sha256":"7b043a96d16edb47904cd472578de4c68e3d0fedcc6ddae82b115731a4ff1218","size":57644},"werewolf/audio/v3/cues-win-mindflayer.wav":{"sha256":"595366d10e48b8c4f21a16a3ba0da0099500ecf5b686cab945327a8eaef51ff9","size":57644},"werewolf/audio/v3/cues-win-friends.wav":{"sha256":"6ff50e6f9b42c92717beeafa1ccdf662d5ee02f1ce5bfd616bdbe63f8d9702ec","size":57644},"werewolf/audio/v3/cues-win-wolf-friends.wav":{"sha256":"63ed6ff5a37567785d127faa7c43e1baa8a73688d9f5da10c6bf8d3d8cacce3a","size":57644},"werewolf/audio/v3/cues-win-draw.wav":{"sha256":"c0a29eca5f4e0339ce79668e6dcd2722231e85976dd31f015218f4c57cb74044","size":33644},"werewolf/audio/card-reveal/v3/reveal-01.wav":{"sha256":"883485ec046cae7e5d1ddc09241856da61db630e2e3cc815ee096b30ddaeebf0","size":588532},"werewolf/audio/card-reveal/v3/reveal-02.wav":{"sha256":"bd30530d4185f4642d24c1de621236922234dc78d008ed7c129bf4593fcb2cda","size":768044},"werewolf/audio/card-reveal/v3/reveal-03.wav":{"sha256":"2d82e7022a9aca8ef20d4f2a0c5786c43057aa294764cda325211a26be38d85e","size":768044},"werewolf/audio/card-reveal/v3/reveal-04.wav":{"sha256":"1d60282278c4ad5a242fa16d41777d6a5e64a4979c7879eb0f5111ae62cf0a81","size":110592},"werewolf/audio/card-reveal/v3/reveal-05.wav":{"sha256":"0b909ca54dca78046077b823b3c85f8a280fd6713dcbab169516c93228e9c763","size":735656},"werewolf/audio/card-reveal/v3/reveal-06.wav":{"sha256":"fc0bc9098437c77de97e347b01cbfb260fa19013edec748d65df19a7f3391787","size":637572},"werewolf/audio/card-reveal/v3/reveal-07.wav":{"sha256":"9f6cad31ad399ef6236cca087ac850e4416f10f9a8d487f6b276ad100732a0c8","size":370080},"werewolf/audio/card-reveal/v3/reveal-08.wav":{"sha256":"c668ae683d17559a372c28bb035ec60ad1369127b991750688d881b6b4e94816","size":209584},"werewolf/audio/card-reveal/v3/reveal-09.wav":{"sha256":"f8d038f50f6b472213550b9d43c54a7d16f7a13fd91b7aa44c68406327fc2585","size":557324},"werewolf/audio/card-reveal/v3/reveal-10.wav":{"sha256":"30109b2a82a4289a7ff36cee586fd13a1b0dcfbd13148638c53b8dd9b77e5f4a","size":768044},"werewolf/audio/card-reveal/v3/reveal-11.wav":{"sha256":"6d26c3dd8f2ca85cdd32e666ae216d8bac56446f34e12f5130d30b86d3c3a1fc","size":768044},"werewolf/audio/card-reveal/v3/reveal-12.wav":{"sha256":"e53230713a7a0bfc70bd268ddb3273e2e472e116ff11b6c51e1c83af87b07cd2","size":768044},"werewolf/audio/card-reveal/v3/reveal-13.wav":{"sha256":"1460e0f44e942f0f39c3b460dab6140e2517110023ce34275dafeaff41b50ce3","size":768044},"werewolf/audio/card-reveal/v3/reveal-14.wav":{"sha256":"b8a27ffc9683c259e14b78ba7b9a0a97017ab4b6cbf277a815e4a5b716d9675e","size":356148},"werewolf/audio/phase/v1/night-start.wav":{"sha256":"e499bdbdfe69200d4228dd3545a3b671070bc88068eb57119b46e4c4368ce9d9","size":673240},"werewolf/audio/phase/v1/meeting-start.wav":{"sha256":"8610d763f3c6e491369b11565eed2aec0ca98f264a4570d7faf9b00a960508ea","size":599680},"werewolf/audio/voted-out/v2/voted-out-01.wav":{"sha256":"e7a055119d520239685abb2496b93950a2e19300ccfa1ec918b20df63f8c41fa","size":338260},"werewolf/audio/voted-out/v2/voted-out-02.wav":{"sha256":"09e4bfd1d8394c25a9654d66b1e5fb9e4441c32f392b5eb9fa3eb65860929bb8","size":606192},"werewolf/audio/voted-out/v2/voted-out-03.wav":{"sha256":"79bca34e5efdb8152cb758609b7f6e43051f0b264e47c8e70e0cbb14ff3990e3","size":294660},"werewolf/audio/voted-out/v2/voted-out-04.wav":{"sha256":"8215a542fda201cc730a2e43a6007170df0d2736535d575921e38c21b04fc4f6","size":768044},"werewolf/audio/voted-out/v2/voted-out-05.wav":{"sha256":"bce98adf7d7e1b28f0eb0bdc2b2beaa1fd8c56063e5d0f9cdb3e10b17c7bde98","size":768044},"werewolf/audio/voted-out/v2/voted-out-06.wav":{"sha256":"20ee0e864429e9cea9e0c300d051adc00687a5d3e6c8762f10f610f908be5eae","size":103688},"werewolf/audio/voted-out/v2/voted-out-07.wav":{"sha256":"317c27201c5f0ce99299cb6cad5ef54b42c0198ec4a55a71b82d53689c1b8641","size":528760},"werewolf/audio/voted-out/v2/voted-out-08.wav":{"sha256":"ea66ab7fde654794aad06a806ec867aa214cfb954abd0e4ccce2f107753f1482","size":768044},"werewolf/audio/game-end/v1/game-end-01.wav":{"sha256":"888cb206f44348889d9587f5eef3714dddde2754f182ab98748f06dd2de88b7e","size":569516},"werewolf/audio/game-end/v1/game-end-02.wav":{"sha256":"5999eba2149919b73ae0363157d4b39ac6c19d7283623c36d6524066fbd60bc1","size":1344044},"werewolf/audio/game-end/v1/game-end-03.wav":{"sha256":"e0e976106a602e74d856bb606c2b881be55f13ddc67bec3378f5fd4c04eed270","size":1344044},"werewolf/audio/game-end/v1/game-end-04.wav":{"sha256":"32bf4b9df41bd6189525a938d60b5c952c08b928b28383bed301118363646c76","size":971852},"werewolf/audio/game-end/v1/game-end-05.wav":{"sha256":"d543ce1b04a84dbeca19f6ee7140d279f3307447cc96cdb36cdb56aca22042a6","size":1344044},"werewolf/audio/morning-death/v1/morning-death-01.wav":{"sha256":"3ea89456c4d3f38718b582c9b06550a27e74d211fc023a2ac0a8afe8946e6782","size":220676},"werewolf/audio/morning-death/v1/morning-death-02.wav":{"sha256":"e947ddf3cbe37fcd05b160cf4f8f1b0d203f274e9d2744eef4c4c95530efd54d","size":335944},"werewolf/audio/morning-death/v1/morning-death-03.wav":{"sha256":"0d08ef74fabefeae8d5bb29a183f7782a465ad6bd9c92a086ff0c82d5211ee62","size":183440},"werewolf/audio/ballot/v1/ballot-enderman.wav":{"sha256":"e2076e74886e47d58b33abf2c4ef5f88803e6a71d171688e4eda8b1a65191460","size":180816},"werewolf/audio/ballot/v1/ballot-notifi.wav":{"sha256":"3196e31492f9441134a7d174a52a7322bb8187647a5f054c0fdd6947a3bdebe9","size":312092},"werewolf/audio/ballot/v1/ballot-enemy.wav":{"sha256":"b3e7e3b83549954a17f56bba99d8274d54722d23dd8e46f0fcd86f7979427616","size":256644},"werewolf/audio/buttons/v2/button-tap.wav":{"sha256":"89057ebc1633b2544ce3e42c0824db547c60f12ec4606a64fcabec8baf5010ee","size":8684},"werewolf/audio/buttons/v2/button-confirm.wav":{"sha256":"367c1cf1869985c0bc551684d8d501d5697f187afb9d6b3b6c361649936ac48e","size":10604},"werewolf/audio/buttons/v2/button-invalid.wav":{"sha256":"5c2f0aae5d94a00e45fd049513a33c90e796ab8543646f25f8aff3fc4d2426a5","size":9644},"werewolf/audio/buttons/v2/button-select.wav":{"sha256":"249a51a246a593edfc1292bc50d51a3215d986a3d2ecca8b8a45262a2ded9d26","size":8204},"werewolf/audio/buttons/v2/button-add.wav":{"sha256":"fe0ddb1b5a0c9839735d0af788ab47168beb44e2e6f9f934bc087385c9e1cc69","size":9644},"werewolf/audio/buttons/v2/button-remove.wav":{"sha256":"f6f1bb6d888258a2a3b31e7a9494844c8ba17a4e1dc21681693e5028ce33d437","size":9644},"werewolf/audio/buttons/v2/button-randomize.wav":{"sha256":"1310159c42f5978aa30483646d46e71da35634620f1c2d0fc9fa8741485bd930","size":12524},"werewolf/audio/buttons/v2/button-navigate.wav":{"sha256":"b5e9f60c71bda4bd8af919eb2251b6c93505a4ec44af07165363220786ba5eb3","size":8204}};
const REPAIR_PAGE = "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Werewolf — offline file repair</title><style>*{box-sizing:border-box}body{margin:0;background:#0b1520;color:#e7edf5;font:1rem/1.6 system-ui,sans-serif;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left))}main{max-width:38rem;margin:2rem auto;overflow-wrap:anywhere}h1{font-size:1.75rem;color:#f5debb}button,a{display:block;width:100%;margin:1rem 0;min-height:44px;padding:.8rem;border:1px solid #b59668;background:#1b2c3d;color:#f5debb;font:700 1rem/1.5 system-ui,sans-serif;text-align:center;white-space:normal;text-decoration:none}button{cursor:pointer}[hidden]{display:none}button:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:3px}</style><main><h1>Offline game files need repair</h1><p>The cached game page is missing. This screen does not read or erase recovery saves, profiles or rankings.</p><p>Download the missing files for this version. Files from a different version will be refused. Keep an internet connection if possible.</p><button id=\"repair\">DOWNLOAD MISSING FILES</button><p id=\"status\" role=\"status\" aria-live=\"polite\"></p><a id=\"open\" hidden>OPEN GAME</a><button id=\"update\">CHECK FOR UPDATE</button><p>If this version is no longer hosted, check for an update. Finish any matches, close all game tabs and installed-app windows, then reopen. No update or page refresh is forced.</p></main><script>\nconst repair=document.getElementById('repair'),update=document.getElementById('update'),status=document.getElementById('status'),open=document.getElementById('open');\nopen.href=new URL('./',location.href).href;\nlet busy=false;\nrepair.onclick=async()=>{\n if(busy)return;busy=true;repair.setAttribute('aria-disabled','true');status.textContent='Downloading missing files. No saved match data is being changed.';\n let channel,timer;\n try{\n  if(!navigator.serviceWorker.controller||typeof MessageChannel==='undefined')throw Error();\n  channel=new MessageChannel();\n  const reply=await new Promise((resolve,reject)=>{timer=setTimeout(reject,135000);channel.port1.onmessage=event=>{if(event.data?.type==='werewolf:offline-repair:v1')resolve(event.data);};navigator.serviceWorker.controller.postMessage({type:'werewolf:offline-repair:v1'},[channel.port2]);});\n  if(reply.ok&&reply.complete){status.textContent='Missing files restored. Open the game when you are ready. Recovery, if enabled, will still ask before showing a saved turn.';open.hidden=false;}\n  else if(reply.reason==='version'){status.textContent='The host has different file contents. No newer files were mixed into this version. Check for an update or try again when this version is available.';}\n  else{status.textContent='Repair could not finish. Keep an internet connection and try again. Your saved match data has not been erased.';}\n }catch{status.textContent='The repair result could not be confirmed. A download may still be running. Try again when connected; no saved match data was erased.';}\n finally{clearTimeout(timer);if(channel){channel.port1.close();channel.port2.close();}busy=false;repair.setAttribute('aria-disabled','false');}\n};\nupdate.onclick=async()=>{if(busy)return;try{const registration=await navigator.serviceWorker.getRegistration();if(!registration)throw Error();await registration.update();status.textContent='Update check requested. If an update finishes downloading, close all old game tabs and installed-app windows after finishing matches, then reopen.';}catch{status.textContent='Update check unavailable. Keep an internet connection and try again. No game data was cleared.';}};\n</script></html>\n";
const ENTRY = new URL("index.html", self.registration.scope).href;
const ROOT = new URL(self.registration.scope).pathname;
const KNOWN = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
const STATUS = "werewolf:offline-status:v1";
const REPAIR = "werewolf:offline-repair:v1";
let repairJob = null;
function manifestReady() {
  return typeof DIGESTS === "object" && DIGESTS !== null &&
    CORE.every(path => /^[a-f0-9]{64}$/.test(DIGESTS[path]?.sha256) && Number.isSafeInteger(DIGESTS[path].size) && DIGESTS[path].size >= 0) &&
    CORE.reduce((sum,path) => sum + DIGESTS[path].size, 0) <= 64 * 1024 * 1024;
}
async function complete() {
  if (!(await caches.keys()).includes(CACHE)) return false;
  const urls = new Set((await (await caches.open(CACHE)).keys()).map(request => request.url));
  return [...KNOWN].every(url => urls.has(url));
}
function failure(reason) { return Object.assign(new Error(reason), {reason}); }
async function verify(response, expected, signal) {
  if (!response.ok || response.type === "opaque") throw failure("network");
  const reader = response.clone().body?.getReader();
  const bytes = new Uint8Array(expected.size);
  let length = 0;
  if (reader) {
    try {
      for (;;) {
        if (signal.aborted) throw failure("network");
        const {done,value} = await reader.read();
        if (done) break;
        if (length + value.length > expected.size) { void reader.cancel().catch(() => {}); throw failure("version"); }
        bytes.set(value,length); length += value.length;
      }
    } finally { reader.releaseLock(); }
  }
  if (length !== expected.size) throw failure("version");
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(value => value.toString(16).padStart(2,"0")).join("");
  if (hash !== expected.sha256) throw failure("version");
}
// Stage verified responses before touching cached contents. Never substitute newer bytes.
async function fill(paths) {
  if (!manifestReady()) throw failure("unsupported");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),120000);
  const staged = [];
  let restored = 0;
  try {
    const cache = await caches.open(CACHE);
    for (const path of paths) {
      const expected = DIGESTS[path];
      let response;
      // The root/index duplicate can sometimes recover a missing shell even offline.
      for (const other of CORE) {
        if (other !== path && DIGESTS[other].sha256 === expected.sha256 && DIGESTS[other].size === expected.size) {
          const candidate = await cache.match(new URL(other,self.registration.scope).href);
          if (candidate) {
            try { await verify(candidate,expected,controller.signal); response = candidate; break; }
            catch { /* An invalid local duplicate is not trusted. */ }
          }
        }
      }
      if (!response) {
        response = await fetch(new Request(new URL(path,self.registration.scope).href,{cache:"no-store",credentials:"same-origin",redirect:"error",signal:controller.signal}));
        await verify(response,expected,controller.signal);
      }
      staged.push([new URL(path,self.registration.scope).href,response]);
    }
    for (const [url,response] of staged) {
      try { await cache.put(url,response); restored++; }
      catch { throw failure("write"); }
    }
    return {ok:true,complete:await complete(),restored};
  } catch (error) {
    throw Object.assign(error,{restored});
  } finally { clearTimeout(timer); controller.abort(); }
}
async function repairMissing() {
  try {
    if (!manifestReady()) throw failure("unsupported");
    const cache = await caches.open(CACHE), missing = [];
    for (const path of CORE) if (!await cache.match(new URL(path,self.registration.scope).href)) missing.push(path);
    return await fill(missing);
  } catch (error) { return {ok:false,reason:error.reason || "network",restored:error.restored || 0,complete:false}; }
}
self.addEventListener("install", event => {
  // A partially published host must never become an active mixed build.
  event.waitUntil(fill(CORE));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    // No skipWaiting, claim, reload or unknown-owner cache deletion.
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    if (url.pathname !== ROOT && url.pathname !== new URL(ENTRY).pathname) return;
    event.respondWith(caches.open(CACHE).then(cache => cache.match(ENTRY)).then(cached => cached || new Response(REPAIR_PAGE,{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; worker-src 'self'; connect-src 'self'"}})));
    return;
  }
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(cached => cached || (KNOWN.has(url.href) ? Response.error() : fetch(request))));
});
self.addEventListener("message", event => {
  const type = event.data?.type, port = event.ports?.[0];
  if (!port || (type !== STATUS && type !== REPAIR)) return;
  event.waitUntil((async () => {
    let result;
    if (type === REPAIR) {
      if (!repairJob) repairJob = repairMissing().finally(() => { repairJob = null; });
      result = await repairJob;
    } else {
      try { result = {complete:await complete(),canRepair:manifestReady(),repairing:!!repairJob}; }
      catch { result = {unavailable:true,canRepair:false}; }
    }
    try { port.postMessage({type,...result}); } catch { /* Caller may have closed its page/port. */ }
  })());
});
