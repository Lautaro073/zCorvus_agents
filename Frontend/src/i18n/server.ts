import {
  getMessages as nextGetMessages,
  getRequestConfig as nextGetRequestConfig,
  getTranslations as nextGetTranslations,
} from "next-intl/server";

export const getMessages = nextGetMessages;
export const getRequestConfig = nextGetRequestConfig;
export const getTranslations = nextGetTranslations;
