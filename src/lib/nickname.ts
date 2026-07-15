/** 닉네임: 한글·영문·숫자만, 1~12자 (공백·특수문자·이모지 불가) */
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{1,12}$/;

export const NICKNAME_PLACEHOLDER =
  "닉네임 ( 띄어쓰기 없이 1~12자,특수문자 불가)";

export function validateNickname(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  if (/\s/.test(raw)) {
    return { ok: false, message: "닉네임에 띄어쓰기를 사용할 수 없습니다." };
  }
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: "닉네임을 입력해주세요." };
  }
  if (value.length > 12) {
    return { ok: false, message: "닉네임은 1~12자로 입력해주세요." };
  }
  if (!NICKNAME_PATTERN.test(value)) {
    return {
      ok: false,
      message: "닉네임은 한글·영문·숫자만 사용할 수 있습니다. (특수문자·이모지 불가)",
    };
  }
  return { ok: true, value };
}
