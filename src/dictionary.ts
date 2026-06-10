// Source: Pwned Passwords database (HaveIBeenPwned) via SecLists, top passwords by frequency,
// plus high-frequency roots found in breach data (adobe, myspace, target, access).
// "|" splits top-50 (score 0) from ranks 51+ (score 1). Lazily parsed to Sets.

const RAW =
  "123456 123456789 password qwerty 12345678 12345 123123 111111 1234 1234567890 1234567 abc123 1q2w3e4r5t q1w2e3r4t5y6 iloveyou 123 000000 123321 1q2w3e4r qwertyuiop yuantuo2012 654321 qwerty123 1qaz2wsx3edc password1 1qaz2wsx 666666 dragon ashley princess 987654321 123qwe 159753 monkey q1w2e3r4 zxcvbnm 123123123 asdfghjkl pokemon football killer 112233 michael shadow 121212 daniel asdasd qazwsx 1234qwer superman admin test user login pass" +
  "|" +
  "123456a azerty qwe123 master 7777777 sunshine 1q2w3e abcd1234 1234561 computer fuckyou aaaaaa 555555 asdfgh asd123 baseball 0123456789 charlie 123654 qwer1234 naruto a123456 jessica soccer jordan liverpool thomas lol123 michelle 123abc nicole 11111111 starwars samsung 1111 secret joshua 123456789a andrew 222222 q1w2e3r4t5 147258369 hunter Password qazwsxedc lovely 999999 jennifer letmein tigger asdf1234 hannah purple justin qwerty1 anthony welcome love 159357 789456123 aa123456 qweasdzxc internet robert minecraft super123 batman trustno1 matthew 789456 88888888 5201314 chocolate flower cookie william 102030 cheese buster pakistan chelsea alexander 888888 12341234 987654 andrea 777777 hello samantha 1234567891 blink182 freedom matrix george amanda 1qazxsw2 forever martin patrick iloveu babygirl summer friends whatever 12qwaszx pepper zaq12wsx 212121 butterfly 0000 orange jasmine joseph maggie banana arsenal mustang 11111 monster passw0rd jonathan snoopy 0987654321 family changeme 131313 123qweasd ginger angel junior diamond asdfasdf taylor eminem oliver 147258 basketball sophie loveme mother benjamin silver 333333 101010 harley Password1 spiderman chicken a123456789 asshole 123654789 12345678910 696969 qweasd yellow melissa qwertyui christian nathan anhyeuem brandon richard metallica never 00000000 lovers mercedes 123456abc gabriel password123 loveyou mickey 147852369 1111111 010203 bailey hello123 sandra london qwerty12 zxcvbn q1w2e3 slipknot 741852963 qwerty12345 prince hockey 55555 angels peanut victoria 12344321 asdf angela rainbow abcdef ferrari google cocacola 1111111111 hahaha carlos gfhjkm qweqwe 456789 12345qwert jordan23 11223344 bubbles steven samuel rental xxxxxx 00000 0123456 barbie morgan asdasdasd alexis elizabeth michael1 austin nicholas school 1q2w3e4r5t6y lollol barcelona pokemon1 iloveyou1 147852 87654321 diablo jasper liverpool1 phoenix madison vanessa jackson 123qweasdzxc danielle marina jesus xbox360 pretty thunder bandit Indya123 a1b2c3d4 232323 adidas dennis edward ronaldo adrian rachel tennis destiny fuckoff friendster lauren qqqqqq 456123 darkness nicolas nirvana mylove scooter fashion merlin qazwsx123" +
  " adobe myspace target access";

let TOP50: Set<string> | null = null;
let FULL: Set<string> | null = null;

function init(): void {
  const idx = RAW.indexOf("|");
  const top = RAW.slice(0, idx).split(" ");
  const rest = RAW.slice(idx + 1).split(" ");
  TOP50 = new Set(top);
  FULL = new Set([...top, ...rest]);
}

export function getRank(word: string): number | undefined {
  if (!TOP50) init();
  if (TOP50!.has(word)) return 1;
  if (FULL!.has(word)) return 51;
  return undefined;
}