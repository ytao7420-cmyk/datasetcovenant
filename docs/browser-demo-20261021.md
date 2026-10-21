# DatasetCovenant 浏览器演示记录 · 2026-10-21

基准 covenant 的四笔钱包写入已完成并最终确认；生产页面实际拒绝了篡改证据包，重新导入原包后恢复完整性通过。因果用途 revision 的 create、capture、assess 和正确 acknowledgement 已最终确认，结果保持 `UNKNOWN`；旧摘要 acknowledgement 已最终回滚，拒绝后的独立读取确认 acknowledgement 仍为空。九笔调用、实际最终下载包和完整清单均已验证；八笔成功执行，一笔按预期回滚。

机器可读索引见 [browser-workflow-2026-10-21.json](../public/evidence/browser-workflow-2026-10-21.json)。本文整理已保存的生产 Chrome 截图、下载文件、receipt、state 和只读 RPC 报告；文档整理过程未操作浏览器、钱包或 RPC。时间均为 UTC；截图的 `captureFileTime` 是文件修改时间，不是链上时间或独立确认的操作时间。

## 环境与参与者

- 生产页面：[DatasetCovenant](https://datasetcovenant-genlayer-57.sales136152.chatgpt.site)。
- 网络：GenLayer Studionet，chain ID `61999`；[公开配置](../public/deployment.json)中的合约为 [`0x9080E0C21432C8B3e66061bB9495645ca1c214B5`](https://explorer-studio.genlayer.com/address/0x9080E0C21432C8B3e66061bB9495645ca1c214B5)。
- 固定合约源码 SHA-256：`9f10d3c10d6416fd20a1889ca3c8087b7720aaa5a61684ab0c282aecc9089dd2`。
- Researcher：`0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9`；nominated analyst：`0xac1aeda44dece819cb462b6819b3b900164be409`。两者为不同的项目控制测试角色，使用合成研究用途和零转账调用。

前八笔调用由用户本人处理钱包警告并确认签名。第九笔正确 revision ack 没有安全警告，执行助手依据已授权的零费用测试范围点击普通 **Confirm**。因此本记录不将九笔全部归因为用户亲自点击签名。

## 基准四写与精确绑定

基准 ID 为 `browser-20261021-trend-bb81`，用途为描述性趋势，结果为 `SUPPORTED`。以下每笔的后续 CLI receipt 均显示 `FINALIZED`、`SUCCESS`、`MAJORITY_AGREE` 和 `leaderOnly:false`；已核对完整 calldata、角色、目标合约及相应 state。共识包含未参与或不同意见的 validator，不代表所有 validator 一致。

| 步骤 | 实际交易 hash | 浏览器观察与独立 CLI 观察 |
| --- | --- | --- |
| Researcher `create_covenant` | `0xe302cf9fc8ff23e1db0737a936124721537fae92e5ac558c83bcc05b24b26188` | 页面先显示 `ACCEPTED`、finalization pending 且保留 journal；刷新原交易后显示 finalized 并移除恢复区。CLI 于 `10:27:19.893Z` 确认最终状态，19/19 项通过。 |
| Analyst `capture_sources` | `0xe21b48fea3451e7a4802ad885f02d8e1e83971d4e8ad466a4a8e6ce65f5ee4b9` | 页面先 accepted，再刷新为 finalized。CLI 于 `10:36:35.839Z` 确认最终状态，9/9 项交易对应检查通过。 |
| Analyst `assess` | `0x12c926ebcd8243d92836aa801bec0578be1077855aa07ed64e4b5cc4ae8435da` | 页面先显示 accepted / `SUPPORTED`，再刷新为 finalized。CLI 于 `10:36:36.377Z` 确认最终状态，9/9 项交易对应检查通过。 |
| Researcher `acknowledge` | `0x71514bbb3faacbeea704fd336c7f4f04366c21dab3373b2e413155096f89de91` | 页面先 accepted 并保留 journal，随后 finalized。CLI 于 `10:40:31.672Z` 确认最终状态及完整 acknowledgement，21/21 项通过。 |

对应文件索引：`browser-create-rpc-recheck.json`、`browser-capture-assess-rpc-recheck.json`、`browser-acknowledgement-rpc-recheck.json`，以及各自 receipt、完整 state 和 raw RPC 文件，均列入机器清单。CLI 是稍后的独立公开读取，不把当时的浏览器 `ACCEPTED` 或 `COMMITTING` 截图改写为已最终确认；每个 supplied hash 查询一次，没有为获得目标状态而持续轮询，也没有从 CLI 签名或广播交易。

基准摘要为：

| 字段 | 完整摘要 |
| --- | --- |
| Intent | `066f1da7f4ef3b2c268263a0bd422b3b2da181c0a6aa8e631cdbab5b15e9e07d` |
| Source | `599e646c4326fccddbff74d195b94eaca42d212cff735cb30d00a5a1a17ff6ab` |
| Assessment；也是 `acknowledge` 的精确第二参数 | `2c88cb872956aadd7766d0cec3001b8fff397dc9c76da980eb2d6abffdef8a87` |
| Acknowledgement 自身摘要 | `c624f3681f0832eebc02a083314af4fe46054caf360dcaf9776baff8ec61bb48` |

[基准最终页面](../public/evidence/browser-screenshots/base-workflow-finalized.jpg)展示生产页最终 readback 和研究员 acknowledgement；`datasetcovenant-browser-20261021-trend-bb81-evidence.json` 是实际 live 下载包，10,033 字节，文件 SHA-256 为 `d48cbf14eb032a32c38c1ec4382476eae892b6a8d21583332f930ae6ff4838c2`。11 项元数据检查和 12 项内容完整性检查通过，完整 covenant 与保存的 CLI acknowledged state 相同。该导出包的 provenance 只包含最后一笔 ack 的交易摘要；其余三笔由各自 receipt 和页面截图补足。

## 实际导入拒绝与恢复

先从生产页面下载 `labor-force` 原始证据包，文件 29,611 字节、SHA-256 `dd8f1ce1b9e0a18cd4c183e27822214f661312d92b0998b80aedcffe1bbcf670`。复制未改变任何字节。下载等待器曾超时；成功下载的依据是实际文件存在及字节核对，而非等待器返回值。

在副本 `corrupted-labor-force-evidence.json` 中，仅将 `covenant.source.metadata_raw` 的一个字节从 `U` 改为 `X`，保留所有摘要和引用。篡改包仍为 29,611 字节，SHA-256 为 `7d609acf518ea9ac5f9800aee13677e8804183bcfb1ea154047d2689dcf225dd`。

生产页实际导入该包后显示 **Evidence failed integrity checks**，失败项为 `source.digest`、`source.metadataRawSha256`、`source.extraction`；见[篡改包被拒绝页面](../public/evidence/browser-screenshots/corrupted-evidence-rejected.jpg)。随后实际重新导入原包，页面显示 **Content integrity verified**；见[原包重新导入页面](../public/evidence/browser-screenshots/original-envelope-import-verified.jpg)。这两次是独立保存的浏览器结果，离线篡改检查只作补充。

页面同时明确：SHA-256 核对记录内容及摘要绑定，不认证 caller-supplied provenance，也不独立验证 leader 解释。原 recorded 包保留 `2026-10-19` 的归档时间，不能将其当作本次 `2026-10-21` 的新鲜链上观察时间。旧归档中展示的 stale-ack 拒绝也不构成本次 revision 浏览器负例通过。

## 因果 revision：最终证据

revision ID 为 `browser-20261021-causal-bb81`，`use=CAUSAL_EFFECT`，父 ID 为 `browser-20261021-trend-bb81`，父 intent digest 精确为 `066f1da7f4ef3b2c268263a0bd422b3b2da181c0a6aa8e631cdbab5b15e9e07d`。revision 自身 intent digest 为 `07857e3546f338960d09f7cf78d852d30f4ba647e214e7fe8f78cedb83148129`。

| revision 步骤 | 实际 hash | 已保存证据的状态 |
| --- | --- | --- |
| `create_covenant` | `0x1e9f1de066d46ea1ba1cc559ee56682f4f61990dd020aecfc0af478651e9d93c` | [页面](../public/evidence/browser-screenshots/revision-create-finalized.jpg)显示 finalized readback；CLI 于 `10:48:32.479Z` 确认 `FINALIZED` / `SUCCESS`。 |
| `capture_sources` | `0xe6b86459611d74e9829f39500477b2ab8588f53f899a2e512198b683f41d782a` | 用户签名后的早期页面观察为 `PROPOSING`；CLI 于 `10:48:33.339Z` 独立确认 `FINALIZED` / `SUCCESS`；[后续页面](../public/evidence/browser-screenshots/revision-capture-finalized.jpg)也显示 finalized readback。 |
| `assess` | `0xd926a8e2db2266c1994416ee4a89b4f2c246479dab109b1ad56908cbc4a25154` | 页面先显示 `ACCEPTED` / `UNKNOWN`，再显示 [finalized readback](../public/evidence/browser-screenshots/revision-assessment-finalized.jpg)。CLI 于 `10:56:05.372Z` 确认 `FINALIZED` / `SUCCESS` 和 `UNKNOWN`。 |
| 使用父 assessment digest 的 stale acknowledgement | `0xc8d35b9bc0c2cf0ee4f31d87b5680478cc3fcf3e892a7d8cefd058a34f70d6a2` | 官方 Explorer 页面与单次 CLI 读取确认 `FINALIZED`、`ERROR` / rollback；拒绝后、正确 ack 前的独立 state 中 acknowledgement 为空。生产应用的负例恢复存在下述回归。 |
| 使用 revision 自身 assessment digest 的 acknowledgement | `0x048be09eab161f9cfdf419777b6c52e2d85eb0fdad85c633288ce1dca22ce502` | 精确参数为 revision assessment digest `8ae0cb96e9d89695811dc8c8eb8a16478d099ea0c715e34a9fe028da877093b7`，nonce `13`。页面先 accepted / pending，再刷新为 `SUCCESS` / finalized readback；单次 CLI 确认 `FINALIZED` / `SUCCESS`，13/13 项通过。 |

`browser-revision-initial-rpc-recheck.json` 对 create / capture 核对了完整 ABI、actor、目标合约、`leaderOnly:false`、执行结果及 validator 共识；`10:48:35.292Z` 的 state 处于 source 阶段。稍后的 `browser-revision-assessment-rpc-recheck.json` 确认 assessment digest 为 `8ae0cb96e9d89695811dc8c8eb8a16478d099ea0c715e34a9fe028da877093b7`，结果为 `UNKNOWN`，`causal_design=NOT_ESTABLISHED`，内容完整性通过。

`10:56:05.372Z` 的 assessed state 中 acknowledgement 为空，这是 stale 测试之前的观察。新的 `browser-stale-ack-rpc-recheck.json` 核对了 stale 交易的完整 ABI、researcher、合约及 full-validator 回滚 payload：`Acknowledgement must bind the exact frozen assessment digest`。`11:00:21.849Z` 保存的 `browser-stale-ack-null-state.json` 是拒绝之后、正确 ack 之前的独立读取，acknowledgement 仍为 `null`，revision assessment digest 与 `UNKNOWN` 结果未改变，内容完整性通过。

浏览器负例最初显示 `PENDING` / lifecycle `ACCEPTED`，但 journal 被提前清除，这是实际观察到的回归。最终回滚确认来自[官方 Explorer Chrome 页面](../public/evidence/browser-screenshots/stale-ack-finalized-explorer.jpg)，空 acknowledgement 来自生产应用重新 [**Read on chain**](../public/evidence/browser-screenshots/stale-ack-finalized-readback.jpg)；不能将这些证据写成应用 **Refresh existing transaction** 完成了负例最终确认。

此后正确 ack 的 `browser-revision-ack-rpc-recheck.json` 于 `11:02:52.254Z` 保存最终 state，acknowledgement 自身摘要为 `b05cff4cca2cd814fca4fddf17954d9f14f9f075e2e5ad788a319bf8512eb37f`，精确绑定 revision 自身的 assessment、intent、source 和角色，verdict 仍为 `UNKNOWN`。[生产最终页面](../public/evidence/browser-screenshots/revision-workflow-finalized.jpg)显示四阶段完成、ack 已记录、finalized readback 且 journal 恢复区消失。

时间顺序有独立证据：负例后空 ack state 的 RPC 观察为 `11:00:21.849Z`，早于正确 ack 原始 receipt 的 `created_at=11:01:17.215375+00:00`。前者独立保留为拒绝后 snapshot，后者最终 state 有正确 ack，两份状态没有互相替换。

最终实际浏览器下载 `datasetcovenant-browser-20261021-causal-bb81-evidence.json` 为 10,102 字节，SHA-256 `b44e9775a84fa17c1026bb295160c3858e588802988cb5522607179d96aaf983`。完整 covenant 与后续 CLI 最终 state 相同，ack 摘要为上述 `b05cff4c…12eb37f`，verdict 保持 `UNKNOWN`。

上述历史演示发生在前端 v2/v3，v3 的负例 `ACCEPTED` 提前清 journal 回归确实出现。v4 属于后续修复工作，已于 2026-10-21T11:09:19.736698Z 发布到同一网站（Sites source `0b14048a652e2fcb3d8241b080d9e7a71d3ba5c3`），增加 accepted rollback journal 保留及只读恢复的两项回归测试；这些历史交易和截图不能被改称为“已在 v4 完成完整流程”。合约源码和地址保持固定。

## 离线复核与公开范围

在仓库根目录执行：

```sh
node scripts/verify-browser-evidence.mjs --allow-pending
node scripts/verify-browser-evidence.mjs
```

`--allow-pending` 允许明确未完成的证据；默认模式要求整个演示完整。最终默认模式实测通过 **79 项检查、9/9 笔 receipt**，输出 `complete:true`、`pending:[]`，机器清单 `status=complete`。此前 7 笔阶段的允许 pending 通过没有被误记为全流程完成。检查核对已保存公共证据的内容完整性及内部对应关系，不发起新的 RPC，也不独立认证 provenance。本文不声称 hosted CI 结果。

公共清单收录九笔交易的 raw RPC 与解码 receipt、基准最终 state、负例后独立空 ack snapshot、revision 最终 state、两个实际最终下载包和 17 张纯网页截图。原截图虽使用 `.png` 文件名，实际字节为 JPEG；公开副本位于 `public/evidence/browser-screenshots/*.jpg`，仅纠正扩展名，字节与 SHA-256 保持原样。

公开截图仅使用纯网页的 `tab.screenshot` 文件。原生钱包、Chrome 安全提醒截图可能包含无关标签页、余额或资产，均仅本地保留；不公开整个 output 目录。所有用途和角色均为测试场景；`SUPPORTED`、acknowledgement 或完整性通过均不认证数据准确性、代表性、科学适用性或因果效应。
