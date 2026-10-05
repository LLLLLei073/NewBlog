/**
 * 读取 Cubism 2 (.model.json) 与 Cubism 4 (.model3.json) 的 manifest，
 * 得到动作组与表情清单。配置、资产测试与文档都复用这一份解析。
 */
export interface Inventory {
  motions: string[];
  expressions: string[];
}

type Cubism4 = {
  FileReferences?: {
    Motions?: Record<string, unknown>;
    Expressions?: { Name?: unknown }[];
  };
};

type Cubism2 = {
  motions?: Record<string, unknown>;
  expressions?: { name?: unknown }[];
};

const names = (values: unknown[] | undefined) =>
  (values ?? []).filter(
    (name): name is string => typeof name === 'string' && name.length > 0,
  );

/** 两种 manifest 的动作组都在对象键上，表情在数组元素的名字字段上。 */
export function inventoryFromManifest(json: unknown): Inventory {
  const data = (json ?? {}) as Cubism4 & Cubism2;
  const motions = Object.keys(
    data.FileReferences?.Motions ?? data.motions ?? {},
  );
  const expressions = names([
    ...(data.FileReferences?.Expressions?.map((item) => item?.Name) ?? []),
    ...(data.expressions?.map((item) => item?.name) ?? []),
  ]);
  return { motions, expressions };
}
